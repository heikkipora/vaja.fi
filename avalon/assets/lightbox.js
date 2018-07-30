(function(document, window, dragscroll, $) {
    var lightboxContainer = document.querySelector('.lightbox-container');

    if (!lightboxContainer) {
        return;
    }

    var config = {
        classNames: {
            lightbox: 'lightbox',
            open: 'lightbox--open',
            single: 'lightbox--single',
            imageContainer: 'lightbox__image',
            zoomed: 'lightbox__image--zoomed',
            control: 'lightbox__control',
            controls: {
                left: 'lightbox__control--left',
                right: 'lightbox__control--right',
                close: 'lightbox__control--close'
            },
            indicators: 'lightbox__indicators',
            indicator: 'lightbox__indicator',
            loading: 'is-loading',
            active: 'is-active',
            dragging: 'is-dragging',
            dragscroll: 'dragscroll'
        }
    };

    var $backgroundCarousel = $('.carousel.lightbox-container');

    // Click timer to help determine drag or zoom
    // zoom out for mouseup and mousedown
    var clickTime;

    var createIcon = function(type) {
        var namespace = 'http://www.w3.org/2000/svg';

        // Create <svg>
        var svg = document.createElementNS(namespace, 'svg');
        svg.setAttribute('role', 'presentation');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('class', 'icon');

        // Create the <use> to reference sprite
        var use = document.createElementNS(namespace, 'use');

        // Get icon href
        const href = (function() {
            var prefix = '#theme-icon-';

            switch (type) {
                case 'left':
                case 'right':
                    return prefix + 'chevron-' + type;

                default:
                    return prefix + type;
            }
        })();

        // Set `href` attributes
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
        if ('href' in use) {
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
        } else {
            use.setAttributeNS(
                'http://www.w3.org/1999/xlink',
                'xlink:href',
                href
            );
        }

        // Add <use> to <svg>
        svg.appendChild(use);

        return svg;
    };

    var createControl = function(type, text) {
        // Button
        var button = document.createElement('button');
        button.setAttribute('type', 'button');

        // Class name
        button.className = 'btn-faux-link lightbox__control';
        var className = config.classNames.controls[type];
        if (className) {
            button.classList.add(className);
        }

        // Label for screen readers
        var label = document.createElement('span');
        label.className = 'sr-only';
        label.textContent = text;
        button.appendChild(label);

        // Icon
        button.appendChild(createIcon(type));

        return button;
    };

    var toTitleCase = function(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    // Returns control template as two seperate button nodes
    var buildControls = function() {
        var controls = ['close', 'left', 'right'].map(function(type) {
            return createControl(type, toTitleCase(type));
        });

        controls.forEach(function(control) {
            overlay.appendChild(control);
        });
    };

    // Create lightbox
    var overlay = document.createElement('div');
    overlay.classList.add(config.classNames.lightbox);
    overlay.setAttribute('hidden', '');

    // Create image container
    var imageContainer = document.createElement('div');
    imageContainer.className = config.classNames.imageContainer;

    // Create image
    var image = document.createElement('img');

    imageContainer.appendChild(image);
    overlay.appendChild(imageContainer);

    // Add controls
    buildControls();

    // Add indiciator dots
    var indicatorContainer = document.createElement('div');
    var indicators = [];
    indicatorContainer.className = config.classNames.indicators;
    overlay.appendChild(indicatorContainer);

    // Inject package
    document.body.appendChild(overlay);

    // Create indicator dots
    var createIndicators = function(count, firstIndex) {
        indicators = [];
        indicatorContainer.innerHTML = '';

        if (count > 1) {
            for (var i = 0; i < count; i++) {
                var indicator = document.createElement('button');
                indicator.setAttribute('type', 'button');
                indicator.classList.add(config.classNames.indicator);
                indicator.setAttribute('data-index', i);
                
                var label = document.createElement('span');
                label.className = 'sr-only';
                label.textContent = i;
                
                indicator.appendChild(label);

                if (i === firstIndex) {
                    indicator.classList.add(config.classNames.active);
                }

                indicatorContainer.appendChild(indicator);

                indicators.push(indicator);
            }
        }
    };

    // Update background carousel
    var updateBackgroundCarousel = function() {
        $backgroundCarousel.carousel(lightbox.getIndex()).carousel('pause');
    };

    // Render lightbox
    var openLightbox = function(firstImage, siblings) {
        var firstImageIndex = siblings.indexOf(firstImage.href);
        
        if (siblings.length === 1) {
            overlay.classList.add(config.classNames.single);
        }

        document.documentElement.classList.add(config.classNames.open);

        lightbox.addImages(siblings, firstImageIndex).setIndex(firstImageIndex);

        createIndicators(siblings.length, firstImageIndex);

        updateLightbox();
        
        imageContainer.classList.add(config.classNames.loading);

        image.setAttribute('src', lightbox.image);

        overlay.removeAttribute('hidden');

        return lightbox;
    };

    // Close lightbox
    var closeLightbox = function(event) {
        overlayImageZoom(event, 'close');

        overlay.setAttribute('hidden', '');

        document.documentElement.classList.remove(config.classNames.open);
    };

    // Update lightbox to reflect current changes
    var updateLightbox = function() {
        imageContainer.classList.add(config.classNames.loading);
        
        image.setAttribute('src', lightbox.image);

        indicators.forEach(function(indicator) {
            indicator.classList.remove(config.classNames.active);

            if (parseInt(indicator.dataset.index) === lightbox.imageIndex) {
                indicator.classList.add(config.classNames.active);
            }
        });

        zoomOut();

        updateBackgroundCarousel();
    };

    // Helper functions
    var getSiblings = function(element) {
        return [].reduce.call(element.childNodes, siblingReducer, []);
    };

    var siblingReducer = function(accumulator, li) {
        if (li.tagName === 'LI') {
            [].forEach.call(li.childNodes, function(anchor) {
                if (anchor.tagName === 'A') {
                    accumulator.push(anchor.href);
                }
            });
        }
        
        return accumulator;
    };

    var zoomIn = function() {
        var clickCoordinates = getImageBoxCoordinates({
            x: event.pageX,
            y: event.pageY
        });

        var coordinatePercentage = {
            x: clickCoordinates.x / image.width,
            y: clickCoordinates.y / image.height
        };

        var date = Date.now();

        imageContainer.classList.add(
            config.classNames.zoomed,
            config.classNames.dragscroll
        );
        
        dragscroll.reset();
        
        imageContainer.scrollLeft =
            image.width * coordinatePercentage.x -
            imageContainer.offsetWidth / 2;
            
        imageContainer.scrollTop =
            image.height * coordinatePercentage.y -
            imageContainer.offsetHeight / 2;
    };

    var zoomOut = function() {
        imageContainer.classList.remove(
            config.classNames.zoomed,
            config.classNames.dragscroll
        );
    };

    var handleImageMouseDown = function() {
        clickTime = Date.now();

        if (imageContainer.classList.contains(config.classNames.zoomed)) {
            image.classList.add(config.classNames.dragging);
        }
    };

    var overlayImageZoom = function(event, action) {
        if (
            imageContainer.classList.contains(config.classNames.zoomed) ||
            action === 'close'
        ) {
            if (Date.now() - clickTime < 150) {
                zoomOut();
                image.classList.remove(config.classNames.dragging);
            }
        } else if (
            image.width < image.naturalHeight ||
            image.height < image.naturalHeight
        ) {
            zoomIn();
        }
        
        image.classList.remove(config.classNames.dragging);
    };

    var getImageBoxCoordinates = function(windowCoords) {
        var bounds = image.getBoundingClientRect();
        var x = 0;
        var y = 0;

        if (Math.sign(windowCoords.x !== -1)) {
            x = parseInt(Math.ceil(windowCoords.x - bounds.x));
        }

        if (Math.sign(windowCoords.y !== -1)) {
            y = parseInt(Math.ceil(windowCoords.y - bounds.y));
        }

        return {
            x: x,
            y: y
        };
    };

    // Event handlers
    var handleKeyDown = function(event) {
        switch (event.key) {
            case 'ArrowRight':
                lightbox.nextImage();
                break;

            case 'ArrowLeft':
                lightbox.lastImage();
                break;

            case 'Escape':
                if (
                    imageContainer.classList.contains(config.classNames.zoomed)
                ) {
                    zoomOut();
                } else {
                    closeLightbox();
                }
                break;
        }
        
        updateLightbox();
    };

    var handleOverlayClick = function(event) {
        event.preventDefault();

        if (event.target.classList.contains(config.classNames.controls.close)) {
            closeLightbox();
            event.stopPropagation();
            updateLightbox();
            return;
        }

        if (event.target.classList.contains(config.classNames.indicator)) {
            lightbox.setIndex(parseInt(event.target.dataset.index));
            updateLightbox();
            return;
        }

        if (event.target.classList.contains(config.classNames.controls.left)) {
            lightbox.lastImage();
            updateLightbox();
            return;
        }

        if (event.target.classList.contains(config.classNames.controls.right)) {
            lightbox.nextImage();
            updateLightbox();
            return;
        }
    };

    // Handle lightbox image click when lightbox
    // is open
    var handleImageClick = function(event) {
        event.preventDefault();

        var siblings = getSiblings(event.currentTarget);

        if (event.target.classList.contains('lightbox-image')) {
            openLightbox(event.target.parentNode, siblings);
            event.stopPropagation();
        }
    };

    // Event listeners
    overlay.addEventListener('click', handleOverlayClick);
    lightboxContainer.addEventListener('click', handleImageClick);
    image.addEventListener('mousedown', handleImageMouseDown);
    image.addEventListener('mouseup', overlayImageZoom);
    image.addEventListener('load', function() {
        imageContainer.classList.remove(config.classNames.loading);
    });
    document.addEventListener('keydown', handleKeyDown);

    // Lightbox object
    var Lightbox = function(images) {
        this.images = images || [];
        this.image = this.images[0] || '';
        this.imageIndex = 0;
    };

    // Move to next image
    Lightbox.prototype.nextImage = function() {
        if (!this.images.length) {
            return null;
        }

        if (this.imageIndex + 1 < this.images.length) {
            this.imageIndex++;
        } else {
            this.imageIndex = 0;
        }
        this.image = this.images[this.imageIndex];

        return this;
    };

    // Move to last image
    Lightbox.prototype.lastImage = function() {
        if (!this.images.length) {
            return null;
        }

        if (this.imageIndex === 0) {
            this.imageIndex = this.images.length - 1;
        } else {
            this.imageIndex--;
        }
        
        this.image = this.images[this.imageIndex];

        return this;
    };

    // Add images to lightbox object before
    // rendering lightbox
    Lightbox.prototype.addImages = function(images) {
        if (!this.images) {
            return null;
        }

        this.images = images;
        this.image = this.images[0];

        return this;
    };

    // Reset index to 0
    Lightbox.prototype.resetIndex = function() {
        this.imageIndex = 0;
        return this;
    };

    // Get index
    Lightbox.prototype.getIndex = function() {
        return this.imageIndex;
    };

    // Set index to specific number
    Lightbox.prototype.setIndex = function(index) {
        this.imageIndex = index;
        this.image = this.images[this.imageIndex];
        return this;
    };

    var lightbox = new Lightbox();
})(document, window, dragscroll, jQuery);