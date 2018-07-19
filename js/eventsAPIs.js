app.eventsAPIs = function () {

    const eventbriteEndpoint = {
        authorizeEndpoint: 'https://www.eventbrite.com/oauth/authorize?',
        response_type: 'token',
        userEndpoint: 'https://www.eventbriteapi.com/v3/events/search/',
        page_number: 1,
        call: 0
    };

    const foursquareEndpoints = {
        explore: 'https://api.foursquare.com/v2/venues/explore',
        venues: 'https://api.foursquare.com/v2/venues/'
    };

    // Seed with Eventbrite data based on user location on page load
    function seedEventbriteEvents (page) {
        const settings = {
            url: eventbriteEndpoint.userEndpoint,
            data: {
                q: '',
                // q: 'jazz',
                ['location.address']: storedData.seed.city,
                // ['location.address']: 'new york',
                ['location.within']: '25mi',
                page: storedData.server.page_number
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", `Bearer ${config.eventbrite.oAuth}`);
            }
        };
        console.log(settings);
        eventbriteMakeAJAXCall(settings, false);
    }

    // Seed with Recommended places data based on user location on page load
    function seedFoursquarePlaces () {
        const query = {
            near: storedData.seed.city,
            client_id: config.fourSquare.idTemp,
            client_secret: config.fourSquare.secretTemp,
            limit: 1,
            v: '20180323'
        };
        foursquareMakeAJAXCall(query);
    }

    function requestEventbriteData () {
        const location = $('#location').val();
        const settings = {
            url: eventbriteEndpoint.userEndpoint,
            data: {
                q: $('#search').val(),
                // q: 'jazz',
                ['location.address']: location !== "" ? location : storedData.seed.city,
                // ['location.address']: 'new york',
                ['start_date.keyword']: $("#date").val(),
                ['location.within']: '50mi',
                page: storedData.server.page_number
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", `Bearer ${config.eventbrite.oAuth}`);
            }
        };
        eventbriteMakeAJAXCall(settings, true);
    }

    function requestFoursquareData () {
        const query = {
            ll: `${storedData.server.location.latitude},${storedData.server.location.longitude}`,
            limit: 1,
            client_id: config.fourSquare.idTemp,
            client_secret: config.fourSquare.secretTemp,
            v: '20180323'
        };
        foursquareMakeAJAXCall(query);
    };

    function eventbriteMakeAJAXCall (settings, bool) {
        storedData.server.call++;
        $.ajax(settings).done(function (data) {
            // Values persisting for the current search term are assigned only once
            if (storedData.server.call === 1) {
                storeData(storedData.server, data);
                console.log(storedData, storedData.server.call, '***wtfffff******');
                app.darksky.getLocalWeather(storedData.server.location.latitude, storedData.server.location.longitude);
                // requestFoursquareData();
            }

            if (bool) {
                updateLocationHeading(storedData.server.location.currentLocation, storedData.server.location.country);
            }
            checkIfEventArrayExist(data);
        }).fail(function (e) {
            console.log(e.statusText, e.responseText, "Call failed!");
        });
    }

    function foursquareMakeAJAXCall (query) {
        $.getJSON(foursquareEndpoints.explore, query, function (response) {
            const venues = response.response.groups[0].items;
            generatePlacesMarkup(venues);
        });
    }

    function storeData (obj, data) {
        obj.pageNumberTotal = data.pagination.page_count;
        obj.pageObjectCount = data.pagination.object_count;
        obj.location = { latitude: data.location.latitude };
        obj.location.longitude = data.location.longitude;
        obj.location.currentLocation = data.location.augmented_location.city ? data.location.augmented_location.city : data.location.augmented_location.region;
        obj.location.country = getCountryCode(data.location.augmented_location.country);
    }

    function checkIfEventArrayExist (data) {
        if (data.events && data.events.length !== 0) {
            events = data.events;
        } else if (data.top_match_events && data.top_match_events.length !== 0) {
            events = data.top_match_events;
            $('.top-match').html("There are no exact matches. What about these events?");
        } else {
            $('.js-autho-results').html('Eventbrite found no results.');
            return;
        }
        generateEventsMarkup(events);
    }

    // Generate Eventbrite with event information
    function generateEventsMarkup(events) {
        console.log(events);
        $('.js-autho-results').html('');

        const results = events.forEach(function (event, i) {
            const image = event.logo === null ? "../images/no-image-available.jpg" : event.logo.original.url;
            const title = event.name.text ? event.name.text : "No Title";
            const id = event.venue_id;
            const html = `<div class="col col-4 results-margin"><div class="results-cell"><button class="results-btn-image"><img src="${image}" alt=""></button><div class="venue-info"><p class="result-title">${title}</p>`;
            getVenueDetailsEventbrite(html, id);
        });
    }

      // Generate Foursquare with places information
      function generatePlacesMarkup(venues) {
        console.log(venues);
        $('.js-foursq-results').html('');

        const results = venues.forEach(function (place, i) {
            const placeholder = "../images/no-image-available.jpg";
            const venueName = place.venue.name ? place.venue.name : "No Title";
            const venueLoc = `${place.venue.location.city}, ${place.venue.location.country}`;
            const venueAdd = `${place.venue.location.address}, ${place.venue.location.city}`;
            const html = `<div class="venue-info"><p class="result-title">${venueName}</p><p class="result-add">${venueAdd}</p></div></div></div>`;
            getVenueDetailsFoursquare(place.venue.id, html);
        });
    }

    function getVenueDetailsFoursquare (venueID, html) {
        const query = {
            client_id: config.fourSquare.idTemp,
            client_secret: config.fourSquare.secretTemp,
            limit: 1,
            v: '20180323'
        };

        $.getJSON(`${foursquareEndpoints.venues}/${venueID}/photos`, query, function (photoData) {
            const image = `${photoData.response.photos.items[0].prefix}width600${photoData.response.photos.items[0].suffix}`;
            const joinedHTML = `<div class="col col-4 results-margin"><div class="results-cell"><button class="results-btn-image"><img src="${image}" alt=""></button>${html}`;
            appendFoursquarePlaces(joinedHTML);
        });
    }

    // Gets venue address
    function getVenueDetailsEventbrite (html, id) {
        const settings = {
            url: `https://www.eventbriteapi.com/v3/venues/${id}/`,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", `Bearer ${config.eventbrite.oAuth}`);
            }
        };
        $.ajax(settings).done(function (data) {
            const joinedHTML = `${html}<p class="result-add">${data.address.localized_address_display}</p></div></div></div>`;
            appendEventbriteEvents(joinedHTML);
        });
    }

    function appendEventbriteEvents (html) {
        $('.results-count').html(`${storedData.server.pageObjectCount} results`);
        $('.js-autho-results').append(html);
    }

    function appendFoursquarePlaces (html) {
        $('.js-foursq-results').append(html);
    }


    function updateLocationHeading (city_region, country) {
        const html = `${city_region}, ${country}`;
        $('.user-loc').html(html);
    }

    $('form').on('submit', "#js-explore-event", function (e) {
        e.preventDefault();
        storedData.server.call = 0;
        storedData.server.page_number = 1;
        requestEventbriteData();
    });

    $('.js-next').on('click', function () {
        if (storedData.server.page_number < storedData.server.pageNumberTotal) {
            storedData.server.page_number += 1;
            requestEventbriteData();
        }
    });

    $('.js-prev').on('click', function () {
        if (storedData.server.page_number > 1) {
            storedData.server.page_number -= 1;
            requestEventbriteData();
        }
    });

    // On page load, check if there is OAuth authentication token
    // If not, login to be redirected to authorization server to obtain OAuth token
    // function oAuthAuthenticate () {
    //     if (window.location.hash) {
    //         const hash = window.location.hash;
    //         oAuth.access_token = hash.split('=')[2];
    //         seedEventbriteEvents();
    //         $('.js-hide').removeClass('js-hide');
    //         $('.js-hide-noAutho').css({
    //             display: 'none'
    //         });
    //     } else {
    //         $('#js-eventbrite-login').on('click', function () {
    //             window.location.replace(`${server.authorizeEndpoint}response_type=${server.response_type}&client_id=${config.eventbrite.key}`);
    //         });
    //     }
    // };

    function main () {
        // seedEventbriteEvents();
        // seedFoursquarePlaces();
    }

    $(main);
};