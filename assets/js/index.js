var markers = [], marker, destMarker, originCoords, destinationCoords;

const elem = document.querySelector('#origin-input');

const getMarkers = async () => {
  return []
}

const getCategories = (list) => {
  const categories = [];

  list.forEach(item => {

    const category = categories.find(it => it?.type?.name === item?.type?.name);

    if (!category) {
      categories.push(item);
    }

  })

  return categories;
}

const setCategories = (list) => {
  const wrapper = document.getElementById('categories');
  list.forEach(category => {
    const div = document.createElement('div');
    div.classList.add('category');
    const img = document.createElement('img');
    const span = document.createElement('span');
    span.innerHTML = category?.type?.name;
    img.src = category?.image;

    div.appendChild(img);
    div.appendChild(span);
    wrapper.appendChild(div);
  })

}

const addMarkerActions = (map) => {
  markers.forEach(m => {
    m.addListener('mouseover', function() {
      m.setAnimation(google.maps.Animation.BOUNCE);
    })

    m.addListener('mouseout', function () {
      m.setAnimation(null);
    })
  })

  new MarkerClusterer(map, markers, {
    styles: [
      {
        height: 80,
        width: 80,
        url: "https://i.ibb.co/BZmkGtB/Group-1.png",
      }
    ]
  });
}

async function setMarkers(map, geocoder) {
    const locations = await getMarkers();

    for (var i = 0; i < locations.length; i++) {
        const location = locations[i];

        const position = {lat: Number(location?.latitude), lng: Number(location?.longitude)};

        const locationInfowindow = new google.maps.InfoWindow({
          content: `
            <h2 class='marker-title'>${location?.type?.name}</h2>
            <p class="marker-text">${location?.title}</p>
          `,
        });

        const marker = new google.maps.Marker({
            position,
            map,
            animation: google.maps.Animation.DROP,
            title: location?.title,
            infowindow: locationInfowindow,
            icon: location?.image
        });

        markers.push(marker);

        google.maps.event.addListener(marker, 'click', function(event) {
            hideAllInfoWindows(map);
            this.infowindow.open(map, this);
            document.getElementById('clear-btn').disabled = false
            destinationCoords = event.latLng
            setFormattedAddress(geocoder, event.latLng, document.getElementById('destination-input'))
        });

    }

    addMarkerActions(map);
}

function setFormattedAddress (geocoder, latLng, input = document.getElementById('origin-input')) {
  geocoder.geocode({
    latLng
  }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (results[0]) {
        input.value = `${results[0].formatted_address}` 
      }
    }
  })
}

const setMarkerOnClick = (e, map) => {

  const latLng = e.latLng || e.geometry.location

  map.panTo(latLng)

  if (!marker || !marker.setPosition) {
    marker = new google.maps.Marker({
      position: latLng,
      map,
    })
  } else {
    marker.setPosition(latLng);
  }

  map.setZoom(15.3)
  setFormattedAddress(geocoder, latLng)
}

const setDestMarkerOnClick = (e, map) => {

  const latLng = e.latLng || e.geometry.location

  map.panTo(latLng)

  if (!destMarker || !destMarker.setPosition) {
    destMarker = new google.maps.Marker({
      position: latLng,
      map,
    })
  } else {
    destMarker.setPosition(latLng);
  }

  map.setZoom(15.3)
  setFormattedAddress(geocoder, latLng, document.getElementById('destination-input'))
}

function hideAllInfoWindows(map) {
    markers.forEach(function(marker) {
        marker.infowindow.close(map, marker);
    }); 
}

let map, infoWindow, geocoder;
function initMap() {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  
  map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false,
    zoom: 14.1,
    streetViewControl: false,
    center: {lat:  41.72276088034398, lng: 44.75888040785368 },
  });

  geocoder = new google.maps.Geocoder();

  directionsRenderer.setMap(map);
  const onChangeHandler = function (e) {
    document.getElementById('clear-btn').disabled = false
  };
  document.getElementById("search").addEventListener("click", () => {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  });
  document.getElementById("origin-input").addEventListener("change", onChangeHandler);
  document.getElementById("destination-input").addEventListener("change", onChangeHandler);

  document.getElementById('clear-btn').addEventListener('click', (e) => {
    document.getElementById("origin-input").value = ''
    document.getElementById("destination-input").value = ''
    document.getElementById('clear-btn').disabled = true
    if (marker) {
      marker.setMap(null)
      marker = null
    }

    if (destMarker) {
      destMarker.setMap(null)
      destMarker = null
    }

    directionsRenderer.setMap(null)
  })

  map.addListener("click", (mapsMouseEvent) => {
    document.getElementById('clear-btn').disabled = false
    setMarkerOnClick(mapsMouseEvent, map)
    originCoords = mapsMouseEvent.latLng
  });

  setMarkers(map, geocoder)
  
  new AutocompleteDirectionsHandler(map);
  infoWindow = new google.maps.InfoWindow();

  const locationButton = document.getElementById('current-location')

  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          originCoords = pos
          setMarkerOnClick({ latLng: pos }, map)
          document.getElementById('clear-btn').disabled = false
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });
}
class AutocompleteDirectionsHandler {
  map;
  originPlaceId;
  destinationPlaceId;
  travelMode;
  directionsService;
  directionsRenderer;
  constructor(map) {
    this.map = map;
    this.travelMode = google.maps.TravelMode.DRIVING;
    const originInput = document.getElementById("origin-input");
    const destinationInput = document.getElementById("destination-input");
    const originAutocomplete = new google.maps.places.Autocomplete(originInput, {
      types: ['geocode']
    });
    const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput,{
      types: ['geocode']
    });
    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
  }
  // Sets a listener on a radio button to change the filter type on Places
  // Autocomplete.

  setupPlaceChangedListener(autocomplete, mode) {
    autocomplete.bindTo("bounds", this.map);
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if(mode === 'ORIG') {
        setMarkerOnClick(place, map)
        originCoords = place.geometry.location
      } else if(mode === 'DEST') {
        setDestMarkerOnClick(place, map)
        destinationCoords = place.geometry.location
      }

    });
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

let click = 0

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  directionsService
    .route({
      origin: originCoords,
      destination: destinationCoords,
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then((response) => {
      directionsRenderer.setDirections(response);

      setTimeout(() => {
        const origin = response?.request?.origin?.location
        const destination = response?.request?.destination?.location
        const travelMode = response?.request?.travelMode
        const link = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat()},${origin.lng()}&destination=${destination.lat()},${destination.lng()}&travelMode=${travelMode}&dir_action=navigate`
        

        if (window.innerWidth <= 768) {
          const actions = document.getElementById('actions')
          const accordion = document.getElementById('accordion')
          
          actions.classList.add('hide')
          accordion.classList.add('hide')
        }

        
        setTimeout(() => {
          const c = confirm('გადასვლა Google Maps-ზე')
          click = 1
          if (c) {
            window.open(link, '_blank').focus();
          }
        }, 200)
        
        
      }, 500)
     
    })
    .catch( (e) => console.error(e) );
}

document.getElementById('action-close').addEventListener('click', () => {
  const actions = document.getElementById('actions')
  const accordion = document.getElementById('accordion')
  click += 1

  if (click === 1) {
    actions.classList.add('hide')
    accordion.classList.add('hide')
  } else if (click === 2) {
    actions.classList.remove('hide')
    accordion.classList.remove('hide')
    click = 0
  }

  
})