// ==========================================================================
// Main JavaScript functions
// ==========================================================================

$(function() {
    'use strict';

    var $body = $(document.body);
    var $html = $(document.documentElement);
    var $window = $(window);
    var defaults = {
        selectors: {
            instagram: '.js-instagram-gallery',
            dribbble: '.js-dribbble-gallery',
            flickr: '.js-flickr-gallery',
            twitter: '.js-twitter-feed',
            player: '.js-player',
            cookie: '.js-alert-cookie',
            cookieAccept: '.js-alert-cookie-accept'
        },
        instagram: {
            type: 'instagram'
        },
        dribbble: {
            type: 'dribbble'
        },
        flickr: {
            type: 'flickr'
        }
    };

    // Setup config
    var config = $.extend(true, {}, defaults, window.theme);

    // Feature support
    var support = {
        storage: function() {
            // Check for local storage support
            if (!('localStorage' in window)) {
                return false;
            }

            var test = '___test';

            // Try to use it (it might be disabled, e.g. user is in private mode)
            // see: https://github.com/sampotts/plyr/issues/131
            try {
                window.localStorage.setItem(test, test);
                window.localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // Shr.js setup
    // --------------------------------------------
    if (window.shr) {
        window.shr.setup();
    }

    // Plyr setup
    // --------------------------------------------
    if (window.plyr) {
        // Setup plyr
        window.plyr.setup(config.selectors.player);

        // Load sprite using plyr
        window.plyr.loadSprite(config.sprite, 'sprite');
    }

    // Menu setup
    // --------------------------------------------
    $('[role="menubar"]').menu({
        minWidth: 767,
        selectors: {
            parent: '.js-nav-bar'
        }
    });

    // Feeds
    // --------------------------------------------
    $(config.selectors.instagram).renderSocial(config.instagram);
    $(config.selectors.dribbble).renderSocial(config.dribbble);
    $(config.selectors.flickr).renderSocial(config.flickr);

    // Watch for DOM changes if editing
    // --------------------------------------------
    if (config.authenticated) {
        var observer = new MutationObserver(function(mutations) {
            // Look through all mutations that just occured
            for (var m = 0; m < mutations.length; ++m) {
                // Look through all added nodes of this mutation
                for (var n = 0; n < mutations[m].addedNodes.length; ++n) {
                    var $node = $(mutations[m].addedNodes[n]);

                    // Video player
                    if ($node.is(config.selectors.player)) {
                        $node.each(function() {
                            window.plyr.setup(this);
                        });
                    } else if ($node.find(config.selectors.player).length) {
                        $node.each(function() {
                            window.plyr.setup(
                                $(this)
                                    .find(config.selectors.player)
                                    .get(0)
                            );
                        });
                    }

                    // Social feeds
                    var $instagram = $node.find(config.selectors.instagram);
                    if ($instagram.length) {
                        $instagram.renderSocial(config.instagram);
                    }

                    var $dribbble = $node.find(config.selectors.dribbble);
                    if ($dribbble.length) {
                        $dribbble.renderSocial(config.dribbble);
                    }

                    var $flickr = $node.find(config.selectors.flickr);
                    if ($flickr.length) {
                        $flickr.renderSocial(config.flickr);
                    }

                    // Twitter feed
                    var $twitter = $node.find(config.selectors.twitter);
                    if ($twitter.length && window.twttr) {
                        window.twttr.widgets.load($twitter.get(0));
                    }
                }
            }
        });

        // Observe for changes in children
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Timeago setup
    // --------------------------------------------
    $('.js-timeago').timeago();

    // Set body padding
    // --------------------------------------------
    function setOffset() {
        var $navbar = $('.nav-bar');
        var height = $navbar.outerHeight(true);

        $body.css('padding-top', height);

        // Show the navbar
        if (!$navbar.hasClass('in')) {
            $navbar.addClass('in');
        }
    }

    // Set initial padding
    setOffset();

    // Recalculate on resize
    $(window).on(
        'resize',
        $.debounce(100, function() {
            setOffset();
        })
    );

    // Close menu on escape
    // --------------------------------------------
    $(document).keyup(function(event) {
        if (event.keyCode == 27 && $html.hasClass('menu-active')) {
            $html.removeClass('menu-active');
        }
    });

    // Search bar animation
    // --------------------------------------------
    var $search = $('.nav-bar .search-control');
    if ($search.length) {
        var hiddenClassName = 'search-control-hidden';

        $search.on('click', function(event) {
            event.stopPropagation();

            if ($search.hasClass(hiddenClassName)) {
                event.preventDefault();
                $search.removeClass(hiddenClassName);
                $search.find('[type="search"]').focus();
            }
        });

        $(document).on('click', function() {
            if (!$search.hasClass(hiddenClassName)) {
                $search.addClass(hiddenClassName);
            }
        });
    }

    // EU Cookies
    // --------------------------------------------
    var $cookieAlert = $(config.selectors.cookie);
    var storageKey = 'eu-cookie';

    // Check if cookie is set, hide cookie message if set
    function checkCookie() {
        // Hide if no support
        if (!support.storage) {
            hideCookieMessage(true);
            return;
        }

        var hide = localStorage.getItem(storageKey) === 'true';

        hideCookieMessage(hide);
    }

    // Set cookie if user is in EU
    function setCookie() {
        if (!support.storage) {
            return;
        }

        localStorage.setItem(storageKey, 'true');
    }

    // Hide cookie message (onclick of close icon or if cookie is set to true)
    function hideCookieMessage(hide) {
        $cookieAlert.toggle(!hide);

        setCookie();
    }

    // Only set storage if the banner is present
    if ($cookieAlert.length) {
        // Click cookie message close icon, set cookie true
        $body.on('click', config.selectors.cookieAccept, function() {
            hideCookieMessage(true);
        });

        // Check location is EU
        checkCookie();
    }
});
