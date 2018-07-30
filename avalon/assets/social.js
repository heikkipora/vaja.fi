// ==========================================================================
// Render social feeds
// ==========================================================================

$.fn.renderSocial = function(options) {
    'use strict';

    var noop = function() {};

    // Global defaults
    var globals = {
        captions: false,
        classNames: {
            media: 'media',
            caption: 'media-caption'
        }
    };

    // Per-network defaults
    var defaults = {
        instagram: {
            count: 8,
            urls: {
                getImages:
                    'https://api.instagram.com/v1/users/{0}/media/recent/?count={1}&access_token={2}'
            }
        },
        dribbble: {
            count: 8,
            cors: true,
            urls: {
                getImages:
                    'https://api.dribbble.com/v2/user/shots?access_token={1}'
            }
        },
        flickr: {
            count: 8,
            urls: {
                search:
                    'https://api.flickr.com/services/rest/?method=flickr.urls.lookupUser&url={0}&api_key={1}&format=json&jsoncallback=?',
                getImages:
                    'https://api.flickr.com/services/rest/?method=flickr.people.getPublicPhotos&user_id={0}&per_page={1}&api_key={2}&format=json&jsoncallback=?',
                image: 'https://farm{0}.staticflickr.com/{1}/{2}_{3}_{4}.jpg',
                web: 'https://www.flickr.com/photos/{0}/{1}'
            }
        }
    };

    // Format a string based on arguments
    // e.g. format.call('test {0}', 1) will return 'test 1'
    var format = function() {
        var args = arguments;

        return this.replace(/{(\d+)}/g, function(match, index) {
            return args[index] !== null && typeof args[index] !== 'undefined'
                ? args[index]
                : '';
        });
    };

    // Check input is null or empty
    function isNullOrEmpty(input) {
        if (input === null || typeof input === 'undefined') {
            return true;
        }

        if (typeof input === 'string') {
            return !input.length;
        }

        if (typeof input === 'object') {
            return !Object.keys(input).length;
        }

        return true;
    }

    // Check variable is an array in lieu of Array.isArray() support
    function isArray(input) {
        return Array.isArray
            ? Array.isArray(input)
            : Object.prototype.toString.call(input) === '[object Array]';
    }

    // Encode spaces in URL (for srcset etc)
    function encodeSpaces(url) {
        return url.replace(/\s/g, '+');
    }

    // Convert a URL to HTTPS
    function upgradeUrl(url) {
        return url.replace('http://', 'https://');
    }

    // Parse a URL
    function parseUrl(url) {
        // Create a faux anchor
        var parser = document.createElement('a');

        // Use the current url as fallback
        if (typeof url !== 'string') {
            url = window.location;
        }

        // Set the href to the url to parse
        parser.href = url;

        // Return the parts we need
        // Fix pathname for IE
        var info = {
            hash: parser.hash,
            host: parser.host,
            hostname: parser.hostname,
            href: format.call('{0}//{1}/', parser.protocol, parser.hostname),
            origin: format.call('{0}//{1}', parser.protocol, parser.hostname),
            pathname:
                parser.pathname.indexOf('/') === 0
                    ? parser.pathname
                    : '/' + parser.pathname,
            protocol: parser.protocol,
            search: parser.search
        };

        // Get the filename from path
        var parts = info.pathname.split('/');
        info.filename = parts[parts.length - 1];

        return info;
    }

    // Cache using session storage
    var cache = {
        supported: function() {
            if (!('sessionStorage' in window)) {
                return false;
            }

            // Try to use it (it might be disabled, e.g. user is in private/porn mode)
            // see: https://github.com/sampotts/plyr/issues/131
            var test = '___test';
            try {
                window.sessionStorage.setItem(test, test);
                window.sessionStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },
        get: function(key) {
            if (!cache.supported()) {
                return;
            }

            try {
                return window.sessionStorage.getItem(key);
            } catch (e) {
                return false;
            }
        },
        set: function(key, data) {
            if (!cache.supported()) {
                return;
            }

            try {
                return window.sessionStorage.setItem(key, data);
            } catch (e) {
                return false;
            }
        }
    };

    // AJAX request handler
    function get(request) {
        request = $.extend(
            true,
            {},
            {
                type: 'GET',
                dataType: 'jsonp',
                url: null,
                cache: true,
                store: true,
                cors: false,
                success: noop,
                before: noop,
                fail: noop
            },
            request
        );

        // URL is required
        if (isNullOrEmpty(request.url)) {
            return;
        }

        // Try and get cached
        var cached = cache.get(request.url);

        // Use cache if possible
        if (request.store && !isNullOrEmpty(cached)) {
            request.before(null, request);
            request.success(JSON.parse(cached));
            return;
        }

        $.ajax({
            type: request.type.toUpperCase(),
            dataType: request.dataType,
            cache: request.cache,
            url: request.url,
            crossdomain: request.cors,
            beforeSend: request.before,
            success: function(data) {
                if (!data) {
                    return null;
                }

                // Cache in session storage
                if (request.store) {
                    cache.set(request.url, JSON.stringify(data));
                }

                request.success(data);
            }
        }).fail(request.fail);
    }

    var build = {
        // Instagram
        // Users: http://instagram.com/developer/endpoints/users/
        // Media: http://instagram.com/developer/endpoints/media/
        // --------------------------------------------
        instagram: function(config) {
            var $feed = $(this);

            // Need a jQuery object
            if (!($feed instanceof jQuery)) {
                return;
            }

            // Handle failure
            function loadFailed() {
                $feed.remove();
            }

            // Require user details
            if (
                isNullOrEmpty(config.user_id) ||
                isNullOrEmpty(config.access_token)
            ) {
                loadFailed();
                return;
            }

            // NOTE: No longer works as of Mar 2018 :-(
            // Get larger/smaller square image
            /* function getUrl(thumbnail, size) {
                var supported = [150, 320, 480, 540, 600, 640, 1080];

                if (!supported.includes(size)) {
                    return upgradeUrl(thumbnail.url);
                }

                return upgradeUrl(
                    thumbnail.url
                        .replace(/vp.*\/.{32}\/.{8}\//, '')
                        .replace(
                            thumbnail.width + 'x' + thumbnail.height,
                            size + 'x' + size
                        )
                );
            } */

            // Get data
            get({
                cache: false,
                cors: config.cors,
                url: format.call(
                    config.urls.getImages,
                    config.user_id,
                    config.count,
                    config.access_token
                ),
                success: function(data) {
                    if (!isNullOrEmpty(data) && !isNullOrEmpty(data.data)) {
                        $feed.empty();

                        $.each(data.data, function(index, photo) {
                            var low_res = photo.images.low_resolution.url;
                            var hi_res = photo.images.standard_resolution.url;

                            var has_caption =
                                !isNullOrEmpty(photo.caption) &&
                                !isNullOrEmpty(photo.caption.text);

                            $feed.append(
                                '<a href="' +
                                    photo.link +
                                    '" target="_blank" class="' +
                                    config.classNames.media +
                                    '">' +
                                    '<img src="' +
                                    encodeSpaces(low_res) +
                                    '" srcset="' +
                                    encodeSpaces(low_res) +
                                    ', ' +
                                    encodeSpaces(hi_res) +
                                    ' 2x" alt="' +
                                    (has_caption ? photo.caption.text : '') +
                                    '">' +
                                    (config.captions && has_caption
                                        ? '<span class="' +
                                          config.classNames.caption +
                                          '">' +
                                          photo.caption.text +
                                          '</span> '
                                        : '') +
                                    '</a>'
                            );
                        });

                        $feed.removeAttr('hidden');
                    } else {
                        loadFailed();
                    }
                },
                fail: loadFailed
            });
        },

        // Dribbble
        // Users: http://developer.dribbble.com/v1/users/
        // Shots: http://developer.dribbble.com/v1/shots/
        // --------------------------------------------
        dribbble: function(config) {
            var $feed = $(this);

            // Need a jQuery object
            if (!($feed instanceof jQuery)) {
                return;
            }

            // Handle failure
            function loadFailed() {
                $feed.remove();
            }

            // Require user details
            if (
                isNullOrEmpty(config.user_id) ||
                isNullOrEmpty(config.access_token)
            ) {
                loadFailed();
                return;
            }

            get({
                cache: false,
                cors: config.cors,
                dataType: 'json',
                url: format.call(
                    config.urls.getImages,
                    config.user_id,
                    config.access_token
                ),
                success: function(response) {
                    if (isArray(response)) {
                        $feed.empty();

                        $.each(response.slice(0, config.count), function(
                            index,
                            shot
                        ) {
                            var normal = upgradeUrl(shot.images.normal);
                            var hi_dpi = !isNullOrEmpty(shot.images.hidpi)
                                ? upgradeUrl(shot.images.hidpi)
                                : normal;

                            $feed.append(
                                '<a href="' +
                                    shot.html_url +
                                    '" target="_blank" class="' +
                                    config.classNames.media +
                                    '">' +
                                    '<img src="' +
                                    encodeSpaces(normal) +
                                    '" srcset="' +
                                    encodeSpaces(normal) +
                                    ', ' +
                                    encodeSpaces(hi_dpi) +
                                    ' 2x" alt="' +
                                    shot.title +
                                    '">' +
                                    (config.captions &&
                                    !isNullOrEmpty(shot.title)
                                        ? '<span class="' +
                                          config.classNames.caption +
                                          '">' +
                                          shot.title +
                                          '</span> '
                                        : '') +
                                    '</a>'
                            );
                        });

                        $feed.removeAttr('hidden');
                    } else {
                        loadFailed();
                    }
                },
                fail: loadFailed
            });
        },

        // Flickr
        // Image sizes: https://www.flickr.com/services/api/misc.urls.html
        // Find user: https://www.flickr.com/services/api/flickr.people.findByUsername.html
        // Get photos: https://www.flickr.com/services/api/flickr.people.getPhotos.html
        // --------------------------------------------
        flickr: function(config) {
            var $feed = $(this);

            // Need a jQuery object
            if (!($feed instanceof jQuery)) {
                return;
            }

            // Handle failure
            function loadFailed() {
                $feed.remove();
            }

            // Require user details
            if (
                isNullOrEmpty(config.link) ||
                isNullOrEmpty(config.access_token)
            ) {
                loadFailed();
                return;
            }

            // Parse provided link
            config.link = config.link.replace('www.', '');
            var url = parseUrl(config.link);

            // If it's not even a Flickr url, bail
            if (url.hostname !== 'flickr.com') {
                loadFailed();
            }

            // If there's no /photos/ in url, add it
            if (url.pathname.indexOf('/photos') !== 0) {
                config.link = config.link.replace(
                    'flickr.com/',
                    'flickr.com/photos/'
                );

                // Re-parse
                url = parseUrl(config.link);
            }

            var url_array = url.pathname.split('/');
            var index_id = url_array.indexOf('photos') + 1;

            if (index_id > 1) {
                var user_id = url_array[index_id];

                // Get the user_id from the social feed, easy to identify as they contain @
                if (user_id.indexOf('@') !== -1) {
                    renderById(user_id);
                } else {
                    getUserId(config.link);
                }
            } else {
                loadFailed();
            }

            // Render a Flickr feed based on username (string)
            function getUserId(url) {
                get({
                    url: format.call(
                        config.urls.search,
                        url,
                        config.access_token
                    ),
                    success: function(data) {
                        if (
                            !isNullOrEmpty(data) &&
                            data.stat === 'ok' &&
                            !isNullOrEmpty(data.user)
                        ) {
                            renderById(data.user.id);
                        } else {
                            loadFailed();
                        }
                    },
                    fail: loadFailed
                });
            }

            // Render a Flickr feed based on ID (crazy format)
            function renderById(id) {
                get({
                    cache: false,
                    cors: config.cors,
                    url: format.call(
                        config.urls.getImages,
                        id,
                        config.count,
                        config.access_token
                    ),
                    success: function(data) {
                        if (
                            !isNullOrEmpty(data) &&
                            data.stat === 'ok' &&
                            !isNullOrEmpty(data.photos)
                        ) {
                            $feed.empty();

                            $.each(data.photos.photo, function(index, photo) {
                                var low_res = format.call(
                                    config.urls.image,
                                    photo.farm,
                                    photo.server,
                                    photo.id,
                                    photo.secret,
                                    'z'
                                );
                                var hi_res = format.call(
                                    config.urls.image,
                                    photo.farm,
                                    photo.server,
                                    photo.id,
                                    photo.secret,
                                    'b'
                                );
                                var url = format.call(
                                    config.urls.web,
                                    id,
                                    photo.id
                                );

                                $feed.append(
                                    '<a href="' +
                                        url +
                                        '" target="_blank" class="' +
                                        config.classNames.media +
                                        '">' +
                                        '<img src="' +
                                        encodeSpaces(low_res) +
                                        '" srcset="' +
                                        encodeSpaces(low_res) +
                                        ', ' +
                                        encodeSpaces(hi_res) +
                                        ' 2x" alt="' +
                                        photo.title +
                                        '">' +
                                        (config.captions &&
                                        !isNullOrEmpty(photo.title)
                                            ? '<span class="' +
                                              config.classNames.caption +
                                              '">' +
                                              photo.title +
                                              '</span> '
                                            : '') +
                                        '</a>'
                                );
                            });

                            // Show images on load
                            $feed.removeAttr('hidden');
                        } else {
                            loadFailed();
                        }
                    },
                    fail: loadFailed
                });
            }
        }
    };

    // Build each item passed
    this.each(function() {
        var $feed = $(this);
        var config = $.extend(true, {}, globals, options, $feed.data('feed'));

        // Required type
        if (!('type' in config)) {
            return;
        }

        // Extend config with defaults for type
        config = $.extend(true, {}, defaults[config.type], config);

        // Build feed
        build[config.type].call($feed, config);
    });

    return this;
};
