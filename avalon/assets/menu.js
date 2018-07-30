// ==========================================================================
// Accessible dropdown menu
// ==========================================================================

$.fn.menu = function(settings) {
    var $menu = $(this);
    var isSetup = false;
    var $parent = null;

    settings = $.extend(true, {
        selectors: {
            menu:   '[role="menu"]',
            parent: null
        },
        classes: {
            open:   'is-open',
            parent: 'menu-shown'
        },
        minWidth:   0
    }, settings);

    // Get links
    var $primaryLinks = $(this).find('> li > a');
    var $secondaryLinks = $primaryLinks.parent('li').find('ul').find('a');
    
    // Get the parent if specified
    if (typeof settings.selectors.parent) {
        $parent = $(settings.selectors.parent);
    }

    // Are we above the min width
    function isEnabled() {
        return (window.innerWidth > settings.minWidth);
    }

    // Only enable if we're above min width and not already setup
    if (isEnabled() && !isSetup) {
        setup();
    }

    $(window).on('resize', function() {
        if (isEnabled() && !isSetup) {
            setup();
        }
        else if (!isEnabled() && isSetup) {
            reset();
        }
    });

    // Hide all
    function hideAll(event) {
        // Bail if not enabled
        if (!isEnabled()) {
            return;
        }

        // Check if the event occured inside the menu
        if (event && event.target) {
            var $target = $(event.target);
            var isChild = $menu.has($target).length;

            if (isChild && !$target.is('a')) {
                return;
            }
        }

        // Find the open menu
        var $open = $menu.find('.' + settings.classes.open);

        // Hide
        $open.removeClass(settings.classes.open);

        // Set ARIA attribute
        $open.find(settings.selectors.menu).attr('aria-hidden', true);
        
        // Remove parent styling hook
        if ($parent !== null) {
            $parent.removeClass(settings.classes.parent);
        }
    }

    // Setup the plugin
    function setup() {
        // Add ARIA role to menu items
        $menu.find('li').attr('role', 'menuitem');

        // Adding aria attribute for menus and items
        $primaryLinks.each(function() {
            var $link = $(this);
            var $li = $link.parent('li');

            $li.find(settings.selectors.menu).each(function() {
                var $target = $(this);

                // Set ARIA on menu
                $target.attr({
                    'aria-hidden': true
                });

                // Set ARIA on li
                $target.parent('li').attr('aria-haspopup', true);
            });
        });

        // Set flag
        isSetup = true;

        // Bind event listeners
        listeners();
    }

    // Cancel out setup
    function reset() {
        // Add ARIA role to menu items
        $menu.find('li').removeAttr('role');

        // Add ARIA to primary links
        $primaryLinks
           .next(settings.selectors.menu)
           .removeAttr('aria-hidden');

        // Adding aria-haspopup for appropriate items
        $primaryLinks.each(function() {
            $(this).parent('li').removeAttr('aria-haspopup');
        });
    }

    // Event listeners
    function listeners() {
        // Show menu on focus or hover (and hide others)
        $primaryLinks.on('focus mouseenter', function(event) {
            // Bail if not enabled
            if (!isEnabled()) {
                return;
            }

            // Hide all other menus
            hideAll();

            // Get links and menu
            var $link = $(this);
            var $target = $link.next(settings.selectors.menu);

            // Bail if no menu
            if (!$target.length) {
                return;
            }

            // Add active class to link
            $link.parent().addClass(settings.classes.open);

            // Show relevant menu
            $target.attr('aria-hidden', false);
            
            // Add parent styling hook
            if ($parent !== null) {
                $parent.addClass(settings.classes.parent);
            }
        });

        // Navigate through child options and close on escape
        $secondaryLinks.on('keydown', function(event) {
            // Bail if not enabled
            if (!isEnabled()) {
                return;
            }

            // Get the current link
            var $link = $(this);

            // Up down arrow keys go through options
            if (event.keyCode == 38 || event.keyCode == 40) {
               event.preventDefault();
               event.stopPropagation();

               // Go back to parent link when at the end or start
               if ($link.parent('li')[event.keyCode == 38 ? "prev" : "next"]('li').length === 0) {
                   $link.parents('ul').parents('li').find('a').first().focus();
               }
               else {
                   $link.parent('li')[event.keyCode == 38 ? "prev" : "next"]('li').find('a').first().focus();
               }
            }
            // Escape closes and focus parent
            else if (event.keyCode == 27) {
                // Bail if not enabled
                if (!isEnabled()) {
                    return;
                }

                // Prevent weird shit
                event.preventDefault();

                // Focus parent
                $link
                    .parents(settings.selectors.menu)
                    .first()
                    .prev('a')
                    .focus();

                // Hide all menus
                hideAll();
            }
            // Space follows link
            else if (event.keyCode == 32) {
                // Bail if not enabled
                if (!isEnabled()) {
                    return;
                }

                // Prevent weird shit
                event.preventDefault();

                // Go to url
                window.location = $link.attr('href');
            }
        });

        // Hide menu on tab out
        $menu
            .find('a')
            .last()
            .on('keydown', function(event) {
                if (event.keyCode == 9) {
                    // If the user tabs out of the navigation hide all menus
                    hideAll();
                }
            });

        // Hide menu on document click outside of the menu
        $(document).on('click', hideAll);

        // Mouseout of the menu closes
        $menu.on('mouseleave', function(event) {
            hideAll();
        });
    }
};