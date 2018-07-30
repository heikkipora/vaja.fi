// ==========================================================================
// Carousel JavaScript functions
// ==========================================================================

// Setup on DOM ready
$(function() {
    $(document.body).buildCarousel();
});

/**
 * Bootstrap Carousel Swipe
 * with added mouse events
 * Based on: https://github.com/maaaaark/bcSwipe
 */
$.fn.bcSwipe = function(settings) {
    var config = {
        threshold: 50
    };
    if (settings) {
        $.extend(config, settings);
    }

    this.each(function() {
        var $carousel = $(this);
        var stillMoving = false;
        var start;

        $carousel.on('touchstart mousedown', onStart);

        function onStart(event) {
            if ($(event.target).is(":input, button, a, [tabindex], iframe")) {
                return;
            }

            if (event.type === 'touchstart' && event.originalEvent.touches.length == 1) {
                start = event.originalEvent.touches[0].pageX;
                stillMoving = true;
                $carousel.on('touchmove', onMove);
            } else {
                // So the mouseup event can occur
                event.preventDefault();

                start = event.pageX;
                stillMoving = true;
                $carousel.on('mousemove mouseup', onMove);

                $(document.body).css("cursor", "-webkit-grabbing");
            }
        }

        function onMove(event) {
            if (stillMoving) {
                var x = (event.type === 'touchmove' ? event.originalEvent.touches[0].pageX : event.pageX);
                var difference = start - x;
                var metThreshold = Math.abs(difference) >= config.threshold;

                if (metThreshold || event.type === 'mouseup') {
                    cancel();

                    $(document.body).css("cursor", "auto");
                }

                if (metThreshold) {
                    $carousel.carousel(difference > 0 ? 'next' : 'prev');
                }
            }
        }

        function cancel() {
            $carousel.off('mousemove mouseup touchmove', onMove);
            start = null;
            stillMoving = false;
        }
    });

    return this;
};

// Carousel
$.fn.buildCarousel = function(settings) {
    if (typeof $.fn.carousel !== "function") {
        return;
    }

    var $window = $(window);

    var config = {
        fit: null,
        supports: {
            objectFit: "objectFit" in document.documentElement.style
        },
        selectors: {
            carousel: ".carousel",
            controls: ".carousel-control",
            indicators: ".carousel-indicators",
            group: ".carousel-group",
            video: "video[autoplay]"
        },
        classNames: {
            enabled: "carousel-enabled",
            limit: "carousel-group-by-{0}",
            inner: "carousel-items",
            item: "item",
            active: "active",
            slide: "slide"
        },
        options: {
            slide: true,
            interval: false,
            controls: true,
            indicators: false
        }
    };

    var templates = {
        controls: function(id) {
            return '<button type="button" class="btn-faux-link left carousel-control" data-target="#' + id + '" data-slide="prev">' +
                '<span class="sr-only">Previous</span>' +
                '<svg role="presentation" class="icon">' +
                '<use xlink:href="#theme-icon-chevron-left"/>' +
                '</svg>' +
                '</button>' +
                '<button type="button" class="btn-faux-link right carousel-control" data-target="#' + id + '" data-slide="next">' +
                '<span class="sr-only">Next</span>' +
                '<svg role="presentation" class="icon">' +
                '<use xlink:href="#theme-icon-chevron-right"/>' +
                '</svg>' +
                '</button>';
        },
        indicators: function(id, $items) {
            var template = '<ol class="carousel-indicators">';

            $.each($items, function(i, $item) {
                template += '<li ' + (i === 0 ? 'class="active"' : '') + '>' +
                    '<button type="button" class="btn-faux-link" data-target="#' + id + '" data-slide-to="' + i + '">' +
                    '<span class="sr-only">' + i + '</span>' +
                    '</button>' +
                    '</li>';
            });

            template += '</ol>';

            return template;
        },
        group: function(className, index) {
            return '<li class="' + className + '" data-group-index="' + index + '"><ul></ul></li>';
        }
    };

    var is = {
        object: function(input) {
            return input !== null && typeof(input) === 'object' && input.constructor === Object;
        },
        number: function(input) {
            return input !== null && (typeof(input) === 'number' && !isNaN(input - 0) || (typeof input == 'object' && input.constructor === Number));
        },
        event: function(input) {
            return this.jQueryEvent(input) || input !== null && typeof input === 'object' && input.constructor === Event;
        },
        jQueryEvent: function(input) {
            return input !== null && typeof input === 'object' && input.constructor === $.Event;
        },
        jQuery: function(input) {
            return input !== null && input instanceof jQuery;
        }
    };

    var $carousels = $(this).find(config.selectors.carousel);

    $.extend(true, config, settings);

    // Check a carousel has breakpoints
    function hasBreakpoints(options) {
        return is.object(options) &&
            hasGroups(options) &&
            ("breakpoints" in options) &&
            is.object(options.breakpoints);
    }

    // Check a carousel has groups
    function hasGroups(options) {
        return is.object(options) &&
            ("group" in options) &&
            is.number(options.group);
    }

    // Watch for breakpoint changes
    function watchSize(options) {
        if (!hasBreakpoints(options)) {
            return;
        }

        var $carousel = $(this);

        function setLimit() {
            var newLimit = options.group; // 3

            $.each(options.breakpoints, function(size, limit) {
                size = parseInt(size);

                if (!is.number(size) || !is.number(limit)) {
                    return;
                }

                if (window.matchMedia("(min-width: {0}px)".format(size)).matches) {
                    newLimit = limit;
                }
            });

            // If limit is the same, bail
            if (newLimit === options.currentLimit) {
                return;
            }

            // Store current limit
            options.currentLimit = newLimit;

            // Group items by count
            groupItems.call($carousel, options, newLimit);

            // Add class
            $carousel.alterClass(config.classNames.limit.format("*"), config.classNames.limit.format(newLimit));
        }

        // Set limit initally
        setLimit();

        // Watch for changes
        $window.on("resize", $.debounce(300, setLimit));
    }

    // Group items together
    function groupItems(options, limit) {
        var $carousel = $(this);
        var $inner = $carousel.children("ul");

        // Find root items
        var $items = $inner.find("li:not('{0}')".format(config.selectors.group));

        // Get the limit, if it's not passed
        if (!is.number(limit)) {
            if (!hasGroups(options)) {
                return;
            }
            limit = options.group;
        }

        var count = $items.length;
        var groups = Math.ceil(count / limit);

        // Remove from DOM
        $items.detach();
        $inner.empty();

        // Inject groups
        for (var index = 0; index < groups; index++) {
            $inner.append(templates.group(config.selectors.group.replace(".", ""), index));
        }

        // Find groups
        var $groups = $inner.find(config.selectors.group);

        // Add items into groups
        $items.each(function(index) {
            var $item = $(this);
            var group = Math.floor(index / limit);
            var $group = $($groups[group]);

            $item.appendTo($group.children("ul"));
        });

        // Set the active item
        setActive.call($groups);

        // Toggle the enabled class hook
        setEnabled.call($carousel);
    }

    // Set item classes
    function setActive() {
        $(this)
            .addClass(config.classNames.item)
            .removeClass(config.classNames.active)
            .filter(":first")
            .addClass(config.classNames.active);
    }

    // Set item classes
    function setEnabled() {
        var $carousel = $(this);
        var $items = $carousel.find(".{0}".format(config.classNames.item));

        // Set enabled class hook
        $carousel.toggleClass(config.classNames.enabled, $items.length > 1);

        // Show if hidden (e.g. thumbs shouldn't show unless > 1 thumb)
        if ($carousel.attr("hidden") && $carousel.find(config.selectors.group).length) {
            // Find actual thumbs
            var $thumbs = $carousel.find("li:not({0})".format(config.selectors.group));

            if ($thumbs.length > 1) {
                $carousel.removeAttr("hidden");
            }
        }
    }

    // Setup object-fit
    function objectFitPolyfill($items, fit) {
        if (!$items || !$items.length || config.supports.objectFit || typeof fit !== "string" || !fit.length) {
            return;
        }

        $items.find("img").each(function() {
            var $image = $(this);
            var $parent = $image.parent();

            $parent.css({
                "background-image": "url(" + $image.attr("src") + ")",
                "background-size": fit,
                "background-position": "50% 50%"
            });

            $image.hide();
        });
    }

    // Build a carousel
    function build() {
        var $inner = $(this);
        var id;

        // Get data options
        var data = $inner.data("carousel");

        // Create clone of options
        var options = $.extend(true, {}, config.options);

        // Default settings for the plugin
        var settings = {
            interval: options.interval
        };

        // Pass options as data attribute or just the ID
        if (is.object(data)) {
            id = data.id;

            // Remove the ID
            delete data.id;

            // Build the options for this carousel
            $.extend(true, options, data);

            // Add interval if specified to plugin options
            $.extend(true, settings, {
                interval: data.interval
            });
        } else {
            id = data;
        }

        // Set inner classes and wrap
        $inner.wrap("<div />");

        // Set carousel
        var $carousel = $inner.parent();

        // Set attributes
        $carousel.attr({
            class: "{0} {1}".format($inner.attr("class"), (options.slide ? config.classNames.slide : "")),
            id: id
        });

        // Cleanup
        $inner.removeAttr("class");
        $inner.removeAttr("data-carousel");

        // Transfer hidden status
        if ($inner.attr("hidden")) {
            $carousel.attr("hidden", "");
            $inner.removeAttr("hidden");
        }

        // Add class hook to inner
        $inner.addClass(config.classNames.inner);

        // Find items
        var $items = $inner.children();

        // Fix up objectFit
        objectFitPolyfill($items, options.fit);

        // Setup breakpoints and grouping
        if (hasBreakpoints(options) || hasGroups(options)) {
            if (hasBreakpoints(options)) {
                watchSize.call($carousel, options);
            } else {
                groupItems.call($carousel, options);
            }

            // Reset items
            $items = $inner.children();
        }
        // or just toggle classes
        else {
            // Set the item classes
            setActive.call($items);

            // Toggle the enabled class hook
            setEnabled.call($carousel);
        }

        // Inject controls
        if (options.controls && !$carousel.find(config.selectors.controls).length) {
            $carousel.append(templates.controls(id));
        }

        // Inject indicators
        if (options.indicators && !$carousel.find(config.selectors.indicators).length) {
            var items = [];

            // Generate item list
            // TODO: handle dynamically adding to carousel using MutationObserver (see sorting)
            $items.each(function(index) {
                items.push({
                    id: id,
                    index: index,
                    active: (index === 0)
                });
            });

            $carousel.prepend(templates.indicators(id, items));
        }

        // Set the left/right control height to clear media controls
        function setControlHeight(event) {
            var $target = $(event.relatedTarget);

            if (!$target.hasClass("item")) {
                $target = $carousel.find(".{0}".format(config.classNames.inner)).children(".active");
            }

            var $controls = $carousel.find(config.selectors.controls);
            var $indicators = $carousel.find(config.selectors.indicators);
            var hasMedia = $target.find(".plyr--setup").length !== 0;
            var offset = 50;

            $controls
                .css("bottom", (hasMedia ? offset : 0) + "px")
                .find("svg")
                .css("top", (hasMedia ? "calc(50% + " + (offset / 2) + "px)" : "50%"));

            $indicators[hasMedia ? "fadeOut" : "fadeIn"](300);
        }

        // Set the active thumb
        function setActiveThumb(event) {
            // Find the targets
            var $target = is.event(event) ? $(event.relatedTarget) : $carousel.find(".item.active");
            var index = $target.index();
            var $triggers = $("[href='#{0}'][data-ride='carousel'],[data-target='#{0}'][data-ride='carousel']".format(id));
            var $actives = $triggers.filter("[data-slide-to='{0}']".format(index));

            // Set active class
            $triggers.removeClass("active");
            $actives.addClass("active");

            // No need to look at groups unless animate event
            if (!is.event(event)) {
                return;
            }

            // Show parent "group" if thumb is hidden
            $actives.each(function() {
                var $active = $(this);

                if (!$active.is(":visible")) {
                    var $carousel = $active.parents(config.selectors.carousel);

                    // Bail if no carousel
                    if (!is.jQuery($carousel)) {
                        return;
                    }

                    // Check if in a group
                    var $group = $active.parents(config.selectors.group);

                    // Show group or item
                    $carousel.carousel(is.jQuery($group) ? $group.index() : $active.index());
                }
            });
        }

        // Set active
        setActiveThumb();

        // Toggle media on carousel change
        function togglePlayback() {
            $carousel.find("." + config.classNames.item).each(function() {
                var $item = $(this);
                var $video = $item.find(config.selectors.video);

                if ($video.length) {
                    var active = $item.hasClass(config.classNames.active);
                    $video.get(0)[active ? "play" : "pause"]();
                }
            });
        }

        // If video is first item
        togglePlayback();

        // Set media playback state
        function setMediaClass(event) {
            // Strip all "media-*" classnames
            $carousel.removeClass(function(i, className) {
                return (className.match(/\bmedia-\S+/g) || []).join(" ");
            });

            // Add new classname
            $carousel.addClass("media-" + event.type);
        }

        // Setup carousel
        $carousel
            .carousel(settings)
            .bcSwipe()
            // Set the controls to allow for plyr controls
            .on("slid.bs.carousel", setControlHeight)
            // Setup thumbs binding to set active thumb
            .on("slide.bs.carousel", setActiveThumb)
            // Toggle playback
            .on("slid.bs.carousel", togglePlayback)
            // Bind media events to classname changes to allow styling
            .on("play pause ended", setMediaClass);
    }

    // Find each carousel
    $carousels.each(build);
};
