var markers = [], marker, destMarker, originCoords, destinationCoords;

var elem = document.querySelector('#origin-input');

function getCategories(list) {
  var categories = [];

  list.forEach(item => {
    var category = categories.find(function(it) {
      return it.type.name === item.type.name
    });

    if (!category) {
      categories.push(item);
    }

  });

  return categories;
}

function setCategories (list) {
  var wrapper = document.getElementById('categories');
  list.forEach(category => {
    var div = document.createElement('div');
    div.classList.add('category');
    var img = document.createElement('img');
    var span = document.createElement('span');
    span.innerHTML = category.type.name;
    img.src = category.image;

    div.appendChild(img);
    div.appendChild(span);
    wrapper.appendChild(div);
  })

}

function addMarkerActions (map) {
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

function setMarkers (map, geocoder) {
    $.ajax({
      url: 'https://again.ge/api/map',
      success: function(result) {
          var locations = result

          var categories = getCategories(locations);
          setCategories(categories);

          for (var i = 0; i < locations.length; i++) {
              var location = locations[i];

              var position = {lat: Number(location.latitude), lng: Number(location.longitude)};

              var locationInfowindow = new google.maps.InfoWindow({
                content: `
                  <h2 class='marker-title'>${location.type.name}</h2>
                  <p class="marker-text">${location.title}</p>
                `,
              });

              var marker = new google.maps.Marker({
                  position,
                  map,
                  animation: google.maps.Animation.DROP,
                  title: location.title,
                  infowindow: locationInfowindow,
                  icon: location.image
              });

              markers.push(marker);

              google.maps.event.addListener(marker, 'click', function(event) {
                  hideAllInfoWindows(map);
                  this.infowindow.open(map, this);
                  document.getElementById('clear-btn').disabled = false;
                  destinationCoords = event.latLng;
                  setFormattedAddress(geocoder, event.latLng, document.getElementById('destination-input'));
              });

          }

          addMarkerActions(map);
      }
    })
    
}

function setFormattedAddress (geocoder, latLng, input = document.getElementById('origin-input')) {
  geocoder.geocode({
    latLng
  }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (results[0]) {
        input.value = `${results[0].formatted_address}`;
      }
    }
  })
}

function setMarkerOnClick (e, map) {

  var latLng = e.latLng || e.geometry.location;

  map.panTo(latLng);

  if (!marker || !marker.setPosition) {
    marker = new google.maps.Marker({
      position: latLng,
      map,
    })
  } else {
    marker.setPosition(latLng);
  }

  map.setZoom(15.3)
  setFormattedAddress(geocoder, latLng);
}

function setDestMarkerOnClick(e, map) {

  var latLng = e.latLng || e.geometry.location;

  map.panTo(latLng);

  if (!destMarker || !destMarker.setPosition) {
    destMarker = new google.maps.Marker({
      position: latLng,
      map,
    });
  } else {
    destMarker.setPosition(latLng);
  }

  map.setZoom(15.3);
  setFormattedAddress(geocoder, latLng, document.getElementById('destination-input'));
}

function hideAllInfoWindows(map) {
    markers.forEach(function(marker) {
        marker.infowindow.close(map, marker);
    }); 
}

var map, infoWindow, geocoder;

function initMap() {
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  
  map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false,
    zoom: 14.1,
    streetViewControl: false,
    center: {lat:  41.72276088034398, lng: 44.75888040785368 },
  });

  geocoder = new google.maps.Geocoder();

  directionsRenderer.setMap(map);
  var onChangeHandler = function (e) {
    document.getElementById('clear-btn').disabled = false;
  };
  document.getElementById("search").addEventListener("click", () => {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  });
  document.getElementById("origin-input").addEventListener("change", onChangeHandler);
  document.getElementById("destination-input").addEventListener("change", onChangeHandler);

  document.getElementById('clear-btn').addEventListener('click', (e) => {
    document.getElementById("origin-input").value = '';
    document.getElementById("destination-input").value = '';
    document.getElementById('clear-btn').disabled = true;
    if (marker) {
      marker.setMap(null);
      marker = null;
    }

    if (destMarker) {
      destMarker.setMap(null);
      destMarker = null;
    }

    directionsRenderer.setMap(null);
  })

  map.addListener("click", function (mapsMouseEvent) {
    document.getElementById('clear-btn').disabled = false;
    setMarkerOnClick(mapsMouseEvent, map);
    originCoords = mapsMouseEvent.latLng;
  });

  setMarkers(map, geocoder);
  
  new AutocompleteDirectionsHandler(map);
  infoWindow = new google.maps.InfoWindow();

  var locationButton = document.getElementById('current-location');

  locationButton.addEventListener("click", function () {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          originCoords = pos;
          setMarkerOnClick({ latLng: pos }, map);
          document.getElementById('clear-btn').disabled = false;
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
  constructor(map) {
    this.map = map;
    this.travelMode = google.maps.TravelMode.DRIVING;
    var originInput = document.getElementById("origin-input");
    var destinationInput = document.getElementById("destination-input");
    var originAutocomplete = new google.maps.places.Autocomplete(originInput, {
      types: ['geocode']
    });
    var destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput,{
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
      var place = autocomplete.getPlace();
      if(mode === 'ORIG') {
        setMarkerOnClick(place, map);
        originCoords = place.geometry.location;
      } else if(mode === 'DEST') {
        setDestMarkerOnClick(place, map);
        destinationCoords = place.geometry.location;
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

var click = 0;

function LinkRedirect(response) {
  setTimeout(function () {
    var origin = response.request.origin.location;
    var destination = response.request.destination.location;
    var travelMode = response.request.travelMode;
    var link = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat()},${origin.lng()}&destination=${destination.lat()},${destination.lng()}&travelMode=${travelMode}&dir_action=navigate`;
    

    var c = confirm('გადასვლა Google Maps-ზე');
    
    click = 1;
    var isMobile = (function () {
      return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
      || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))
    })()
    alert('device is mobile='+isMobile)
    if (c) {
      if(isMobile) { 
        window.location.href = link
      } else {
        window.open(link, '_blank')
      }
    }
    
  }, 700);
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  directionsService
    .route({
      origin: originCoords,
      destination: destinationCoords,
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then(function (response) {
      directionsRenderer.setDirections(response);

      if (window.innerWidth <= 768) {
        var actions = document.getElementById('actions');
        var accordion = document.getElementById('accordion');
        
        actions.classList.add('hide');
        accordion.classList.add('hide');

      }
      
      LinkRedirect(response)

    })
    .catch( (e) => console.error(e) );
}


var action = document.getElementById('action-close')

if (action) {
  action.addEventListener('click', function () {
    var actions = document.getElementById('actions');
    var accordion = document.getElementById('accordion');
    click += 1;
  
    if (click === 1) {
      actions.classList.add('hide');
      accordion.classList.add('hide');
    } else if (click === 2) {
      actions.classList.remove('hide');
      accordion.classList.remove('hide');
      click = 0;
    }
    
  })
}
