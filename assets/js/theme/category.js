import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        $('.card-figure').hover(
            function () {
                var image = $(this).find('.card-image');
                var hoverSrcset = image.attr('data-hover-srcset');
                var currentSrcset = image.attr('srcset');
                if (hoverSrcset && hoverSrcset != '') image.attr('srcset', hoverSrcset);
            }, function () {
                var image = $(this).find('.card-image');
                var originalSrcset = image.attr('data-srcset');
                var currentSrcset = image.attr('srcset');
                image.attr('srcset', originalSrcset);
            }
        );

        $('#addAllToCart').click(function () {
            const productsData = $(this).data('products').slice(0, -1)
            products = productsData.split(",")
            addMultipleToCart()
        })

        let products = []
        let addMultipleToCart = function () {
            if (products.length) {
                for (let i = products.length - 1; i >= 0; i--) {
                    $.ajax({
                        type: 'GET',
                        async: false,
                        url: `/cart.php?action=add&product_id=${products[i]}`,
                    })
                }
            }
            window.location = "/cart.php"
        }

        let getCartQuantity = function () {
            let total = 0
            $.ajax({
                type: 'GET',
                async: false,
                url: `/api/storefront/cart`,
                success: function (data) {
                    if (data.length !== 0){
                        const physicalItems = data[0]['lineItems']['physicalItems']
                        for (let i = physicalItems.length - 1; i >= 0; i--) {
                            total += physicalItems[i].quantity
                        }
                    }
                }
            })
            return total
        }

        $('#removeAllItems').val(getCartQuantity())
        if ($('#removeAllItems').val() > 0) $('#removeAllItems').show();
        else $('#removeAllItems').hide();

        let getCartID = function () {
            let cartID = ''
            $.ajax({
                type: 'GET',
                async: false,
                url: `/api/storefront/cart`,
                success: function (data) {
                    if (data.length !== 0){
                        cartID = data[0]['id']
                    }
                }
            })
            return cartID
        }

        $('#removeAllItems').click(function () {
            const cartID = getCartID()
            if (!cartID) return
            $.ajax({
                type: 'DELETE',
                async: false,
                url: `/api/storefront/carts/${cartID}`,
                success: function (data) {
                    alert(`deleted ${cartID}`)
                }
            })
        })

    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
