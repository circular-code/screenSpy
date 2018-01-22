
document.addEventListener('DOMContentLoaded', function(event) {
  getTestData();
  setInterval(checkIfStreamSelected, 5000);
  initialiseUserInfoModal();
});

// TODO OVERVIEW Größe verändern bei kleinerem Fenster/Skalierung von Fenster
// TODO Werte umrechnen modal
// TODO Format im stream overview anzeigen
// TODO Session beendet hinweis

var currentSession                = null;
var data                          = null;
var stopGetStream                 = false;
var lastKnownOverlayImagepath     = null;
var overlayImageDrawPositionX     = null;
var overlayImageDrawPositionY     = null;
var streamSelected                = false;
var currentlySelectedStream       = null;
var imageModifikator              = 0;
var startDrawingWidthAt           = 0;
var startDrawingHeightAt          = 0;

function getTestData() {
  if (currentSession === null) {
    var getRequest = new XMLHttpRequest();
    getRequest.open('GET', '/api/init.sctx', true);

    getRequest.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        data = JSON.parse(this.response);
        console.log(data);
        currentSession = data.session;

        buildOverview(data);
        fillSelectWithStreams(data);
        fillUserInfoModal(data);

      } else
        console.log('We reached our target server, but it returned an error');
    };
    getRequest.onerror = function() {
      console.log('There was a connection error of some sort');
    };
    getRequest.send();
  }
  else
    alert('illegal Session');
}

function fillSelectWithStreams(streamData) {
  for (var i = 1; i<=streamData.streamCount; i++){
    var option = document.createElement('option');
    option.value = i;
    option.text = 'stream ' + i;
    document.getElementById('streamSelect').add(option);
  }
}

function buildCanvas(stream) {
  console.log(data.streams[stream]);

  var canvas        = document.getElementById('streamCanvas');
  var canvasOverlay = document.getElementById('overlayCanvas');

  var canvasWidth   = window.innerWidth;
  var canvasHeight  = window.innerHeight;
  var sessionWidth  = data.streams[stream].width;
  var sessionHeight = data.streams[stream].height;

  var format                   = sessionWidth / sessionHeight;
  var widthDifference          = canvasWidth - sessionWidth;
  var heightDifference         = canvasHeight - sessionHeight * format;
  var heightDifferenceNegative = sessionHeight * format - canvasHeight;
  var widthDifferenceNegative  = sessionWidth - canvasWidth;

  canvas.width          = canvasWidth;
  canvas.height         = canvasHeight;
  canvasOverlay.width   = canvasWidth;
  canvasOverlay.height  = canvasHeight;

  if (canvasWidth > sessionWidth) {

    if (canvasHeight > sessionHeight) {

      if (widthDifference > heightDifference) {
        startDrawingHeightAt = 0;

        imageModifikator = canvasHeight / sessionHeight;
        startDrawingWidthAt = (canvasWidth - (sessionWidth * imageModifikator))/2;
      }
      else if (heightDifference > widthDifference) {
        startDrawingWidthAt = 0;

        imageModifikator = canvasWidth / sessionWidth;
        startDrawingHeightAt = (canvasHeight - (sessionHeight * imageModifikator))/2;
      }
      else if (heightDifference === widthDifference) {
        startDrawingWidthAt = 0;
        startDrawingHeightAt = 0;
        imageModifikator = canvasWidth / sessionWidth;
      }
    }
    else if (canvasHeight < sessionHeight) {
      startDrawingHeightAt = 0;

      imageModifikator = canvasHeight / sessionHeight;
      startDrawingWidthAt = (canvasWidth - (sessionWidth * imageModifikator))/2;
    }
    else if (canvasHeight === sessionHeight) {
      startDrawingWidthAt = widthDifference/2;
    }
  }

  else if (canvasWidth < sessionWidth) {

    if (canvasHeight > sessionHeight) {
        startDrawingWidthAt = 0;

        imageModifikator = canvasWidth / sessionWidth;
        startDrawingHeightAt = (canvasHeight - (sessionHeight * imageModifikator))/2;
    }
    else if (canvasHeight < sessionHeight) {

      if (widthDifferenceNegative > heightDifferenceNegative) {
        startDrawingWidthAt = 0;

        imageModifikator = canvasWidth / sessionWidth;
        startDrawingHeightAt = (canvasHeight - (sessionHeight * imageModifikator))/2;
      }
      else if (heightDifferenceNegative > widthDifferenceNegative) {
        startDrawingHeightAt = 0;

        imageModifikator = canvasHeight / sessionHeight;
        startDrawingWidthAt = (canvasWidth - (sessionWidth * imageModifikator))/2;
      }
      else if (heightDifferenceNegative === widthDifferenceNegative) {
        startDrawingHeightAt = 0;
        startDrawingWidthAt = 0;

        imageModifikator = canvasHeight / sessionHeight;
      }
    }
    else if (canvasHeight === sessionHeight) {
      startDrawingWidthAt = 0;

      imageModifikator = canvasWidth / sessionWidth;
      startDrawingHeightAt = (canvasHeight - (sessionHeight * imageModifikator))/2;
    }
  }
  else if (canvasWidth === sessionWidth) {
    if (canvasHeight > sessionHeight) {
        startDrawingWidthAt = 0;

        imageModifikator = canvasWidth / sessionWidth;
        startDrawingHeightAt = (canvasHeight - (sessionHeight * imageModifikator))/2;
    }
    else if (canvasHeight < sessionHeight) {
      startDrawingHeightAt = 0;

      imageModifikator = canvasHeight / sessionHeight;
      startDrawingWidthAt = (canvasWidth - (sessionWidth * imageModifikator))/2;
    }
    else if (canvasHeight === sessionHeight) {

    }
  }
}

function buildOverview(data) {
  var testDiv =   document.getElementById('testDiv');
  testDiv.innerHTML = '';

  Array.prototype.forEach.call(data.streams, function(stream, i){
    var newDiv = document.createElement('div');
    newDiv.style.position = 'absolute';
    newDiv.style.top = stream.top / (stream.height/stream.previewHeight) + 'px';
    newDiv.style.left = stream.left / (stream.height/stream.previewHeight) + 'px';
    if (stream.primary === true)
      if (newDiv.classList)
        newDiv.classList.add('primaryScreen');
      else
        newDiv.className += 'primaryScreen';

    var newImage = new Image(stream.previewWidth,stream.previewHeight);
    newImage.src = "data:image/gif;base64,"+ stream.previewData;
    newImage.style.position = "relative";
    newImage.style.zIndex = 2;

    newImage.addEventListener('click', function() {
      y = i+1;
      document.getElementById('streamSelect').value = y;
      selectStream("" +y);
    });

    var newInfoContainer = document.createElement('div');
    if (newInfoContainer.classList)
      newInfoContainer.classList.add('infoContainer');
    else
      newInfoContainer.className += 'infoContainer';

    if (newDiv.classList.contains('primaryScreen')) {
        var newPrimaryInfo = document.createElement('h2');
        newPrimaryInfo.innerHTML = 'Primary Display';
        newInfoContainer.appendChild(newPrimaryInfo);
      }

    var newInfoHeading = document.createElement('h3');
    var newInfoNumber = document.createElement('p');
    var newInfoText = document.createElement('p');

    newInfoNumber.innerHTML = "Stream " + (i+1);
    newInfoNumber.style.marginBottom = "10px";
    newInfoHeading.innerHTML = "Resolution";
    newInfoText.innerHTML = stream.width + "x" + stream.height;

    newInfoContainer.appendChild(newInfoNumber);
    newInfoContainer.appendChild(newInfoHeading);
    newInfoContainer.appendChild(newInfoText);
    newDiv.appendChild(newInfoContainer);
    newDiv.appendChild(newImage);
    testDiv.appendChild(newDiv);
  });
}

function getOverview() {
  var postRequest = new XMLHttpRequest();
  postRequest.open('POST', ' /api/overview.sctx', true);
  postRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
  postRequest.send('session=' + currentSession);

  postRequest.onload = function() {
    if (this.status >= 200 && this.status < 400) {
      var data = JSON.parse(this.response);
      buildOverview(data);
    }
    else
      console.log('Failed to load Overview');
  };
}

function selectStream(stream) {

  stopGetStream = true;

  if (stream !== "overview") {
    currentlySelectedStream = stream;
    streamSelected = true;

    document.getElementById('overlayCanvas').style.display = 'block';
    document.getElementById('streamCanvas').style.display = 'block';

    stream = stream -1;
    var postRequestStream = new XMLHttpRequest();
    postRequestStream.open('POST', ' /api/select.sctx', true);
    postRequestStream.setRequestHeader('Content-Type', 'text/html; charset=utf-8');
    postRequestStream.send('session=' + currentSession +'&stream=' + stream);

    postRequestStream.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        resetCanvas();
        buildCanvas(stream);
        addResizeEventListener();
        stopGetStream = false;
        getStream();
        //intervalID = setInterval(function(){ getStream();
        //}, 100);
      }
      else if ((this.status == 409))
        console.log('Failed to select Stream ' + stream);
      else if ((this.status == 410))
        console.log('Invalid session' + currentSession);
    };
  }
  else if (stream === "overview") {
    streamSelected = false;
    showOverview();
  }
  else
    console.log('Invalid Stream' + stream);
}

function checkIfStreamSelected() {
  if (streamSelected !== true)
    getOverview();
}

function getStream() {
  var postRequestStream = new XMLHttpRequest();
  postRequestStream.open('POST', '/api/event.sctx', true);
  postRequestStream.setRequestHeader('Content-Type', 'application/json;');
  postRequestStream.send('session=' + currentSession);

  postRequestStream.onload = function() {

    if (this.status >= 200 && this.status < 400) {
      var streamData = this.response;
      var parsedStreamData = JSON.parse(streamData);

      if (parsedStreamData.commands.length !== 0) {

        for (i = 0; i < parsedStreamData.commands.length; i++) {

          if (parsedStreamData.commands[i].hasOwnProperty('command')) {

            switch(parsedStreamData.commands[i].command) {
                case 'geometry':
                    resetCanvas();
                    console.log('geometry changed');
                    break;
                case 'image':
                    drawStream(parsedStreamData.commands[i].uri, parsedStreamData.commands[i].x, parsedStreamData.commands[i].y, parsedStreamData.commands[i].width, parsedStreamData.commands[i].height);
                    console.log('images drawn');
                    break;
                case 'overlay':
                    console.log('overlay changed');
                    console.log(parsedStreamData);
                    if (parsedStreamData.commands[i].visible === true) {
                      document.getElementById('overlayCanvas').style.display = 'block';
                    }
                    else if (parsedStreamData.commands[i].visible === false) {
                      document.getElementById('overlayCanvas').style.display = 'none';
                    }
                    break;
                case 'overlayImage':
                    console.log('overlayImage changed');
                      saveOverlayImage(parsedStreamData.commands[i].uri);
                    break;
                case 'overlayPosition':
                    setOverlayPosition(parsedStreamData.commands[i].x,parsedStreamData.commands[i].y);
                    break;
                case 'terminated':
                    console.log('terminated');
                    stopGetStream = true;
                    displayTerminatedMessage();
                    return;
                default:
                    console.log('no streamcommand ommited');
                    break;
            }
          }
        }
      }
      if (stopGetStream === false)
        getStream();
    }
    else {
      console.log('Failed to get Stream');
    }
  };
}

function drawStream(imagepath, imageDrawPositionX, imageDrawPositionY, imageDrawWidth, imageDrawHeight) {
  var contextDraw = document.getElementById('streamCanvas').getContext('2d');
  var imageDrawObject = new Image();

  imageDrawObject.onload = function() {
    contextDraw.drawImage(imageDrawObject, (imageDrawPositionX*imageModifikator)+startDrawingWidthAt, (imageDrawPositionY*imageModifikator)+startDrawingHeightAt, imageDrawWidth*imageModifikator, imageDrawHeight*imageModifikator);
  };
  imageDrawObject.src = imagepath;
}

function setOverlayPosition(overlayPositionX, overlayPositionY) {
  overlayImageDrawPositionX = overlayPositionX-32;
  overlayImageDrawPositionY = overlayPositionY-32;
  drawOverlay();
}

function drawOverlay() {
  if (lastKnownOverlayImagepath !== null) {
    var context = document.getElementById('overlayCanvas');
    contextDraw = context.getContext('2d');
    contextDraw.clearRect(0, 0, context.width, context.height);
    var imageDrawObject = new Image();

    imageDrawObject.onload = function() {
      contextDraw.drawImage(imageDrawObject, (overlayImageDrawPositionX*imageModifikator)+startDrawingWidthAt, (overlayImageDrawPositionY*imageModifikator)+startDrawingHeightAt);
    };
    imageDrawObject.src = lastKnownOverlayImagepath;
  }
}

function saveOverlayImage(src) {
  var img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function() {
    var canvas = document.createElement('CANVAS');
    var ctx = canvas.getContext('2d');
    canvas.height = this.height;
    canvas.width = this.width;
    ctx.drawImage(this, 0, 0);
    lastKnownOverlayImagepath = canvas.toDataURL("image/png");
  };
  img.src = src;
  if (img.complete || img.complete === undefined) {
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    img.src = src;
  }
}

function showOverview() {
  //if (intervalID !== null)
  //  clearInterval(intervalID);
  document.getElementById('overlayCanvas').style.display = 'none';
  document.getElementById('streamCanvas').style.display = 'none';
}

function initialiseUserInfoModal() {

  var modal = document.getElementById('userInfoModal');
  var btn = document.getElementById("userInfo");
  var span = document.getElementById("modalCloseButton");

  btn.onclick = function() {
      modal.style.display = "block";
  };

  span.onclick = function() {
      modal.style.display = "none";
  };

  window.onclick = function(event) {
      if (event.target == modal) {
          modal.style.display = "none";
      }
  };
}

function fillUserInfoModal() {

  var modalBody = document.getElementById('userInfoContent');

  for(var firstLevelInfo in data.system){
      var newInfoBlockWrapper = document.createElement('div');
      var newInfoBlock = document.createElement('div');
      var newHeading = document.createElement('h1');
      var newHeadingIcon = document.createElement('i');

      newInfoBlockWrapper.classList.add('infoBlockWrapper');
      newInfoBlock.classList.add('infoBlock');
      newHeading.classList.add('modalHeading');
      newHeadingIcon.classList.add('fa');

      var icon = null;
      switch(firstLevelInfo) {
        case 'memory':
            icon = ' fa-cogs';
            break;
        case 'os':
            icon = ' fa-window-restore';
            break;
        case 'domain':
            icon = ' fa-sitemap';
            break;
        case 'drives':
            icon = ' fa-hdd-o';
            break;
        case 'user':
            icon = ' fa-user';
            break;
        case 'host':
            icon = ' fa-home';
            break;
        case 'bus':
            icon = ' fa-exchange';
            break;
        case 'displayAdapter':
            icon = ' fa-desktop';
            break;
        case 'bios':
            icon = ' fa-cog';
            break;
        case 'keyboard':
            icon = ' fa-keyboard-o';
            break;
        case 'processor':
            icon = ' fa-microchip';
            break;
        default:
            icon = ' fa-minus';
            break;
      }

      newHeadingIcon.className += icon;
      newHeading.innerHTML = firstLevelInfo;

      newInfoBlockWrapper.appendChild(newHeadingIcon);
      newInfoBlockWrapper.appendChild(newHeading);
      newInfoBlockWrapper.appendChild(newInfoBlock);

      if (typeof(data.system[firstLevelInfo]) !== 'object'){
        var newParagraphFirstLevel = document.createElement('p');
        newParagraphFirstLevel.innerHTML = data.system[firstLevelInfo];

        newInfoBlock.appendChild(newParagraphFirstLevel);
      }

      if (typeof(data.system[firstLevelInfo]) === 'object'){
        for(var secondLevelInfo in data.system[firstLevelInfo]){

          var newInfoBlockSecondLevel = document.createElement('div');
          var newHeadingSecondLevel = document.createElement('h2');
          var newParagraphSecondLevel = document.createElement('p');

          newInfoBlockSecondLevel.classList.add('infoBlockSecondLevel');
          newHeadingSecondLevel.classList.add('headingSecondLevel');
          newParagraphSecondLevel.classList.add('paragraphSecondLevel');

          newInfoBlock.appendChild(newInfoBlockSecondLevel);

          if (typeof(data.system[firstLevelInfo][secondLevelInfo]) === 'object'){
            for(var thirdLevelInfo in data.system[firstLevelInfo][secondLevelInfo]){

              var newParagraphThirdLevel = document.createElement('p');
              newParagraphThirdLevel.classList.add('paragraphThirdLevel');
              newParagraphThirdLevel.innerHTML = data.system[firstLevelInfo][secondLevelInfo][thirdLevelInfo];
              if (newParagraphThirdLevel.innerHTML !== "")
                newInfoBlock.appendChild(newParagraphThirdLevel);
            }
          }
          newHeadingSecondLevel.innerHTML = secondLevelInfo;
          newParagraphSecondLevel.innerHTML = data.system[firstLevelInfo][secondLevelInfo];
          newInfoBlockSecondLevel.appendChild(newHeadingSecondLevel);

          if (typeof(data.system[firstLevelInfo][secondLevelInfo]) !== 'object')
            newInfoBlockSecondLevel.appendChild(newParagraphSecondLevel);

        }
      }
      modalBody.appendChild(newInfoBlockWrapper);
   }
}

// ja das ist geklaut, berechtigt ? https://developer.mozilla.org/de/docs/Web/Events/resize
function addResizeEventListener() {

  window.addEventListener("resize", resizeThrottler, false);

  var resizeTimeout;
  function resizeThrottler() {
    // ignore resize events as long as an actualResizeHandler execution is in the queue
    if ( !resizeTimeout ) {
      resizeTimeout = setTimeout(function() {
        resizeTimeout = null;
        actualResizeHandler();

       // The actualResizeHandler will execute at a rate of 15fps
     }, 1000);
    }
  }

  function actualResizeHandler() {
    if (currentlySelectedStream !== "overview") {
      resetCanvas();
      selectStream(currentlySelectedStream);
    }
  }
}

function resetCanvas() {
  var resetCanvas = document.getElementById('streamCanvas');
  var resetCanvasContext = resetCanvas.getContext('2d');
  resetCanvasContext.fillStyle = '#000000';
  resetCanvasContext.fillRect(0, 0, resetCanvas.width, resetCanvas.height);
}

function displayTerminatedMessage() {
  resetCanvas();
  var canvas = document.getElementById("streamCanvas");
  var ctx = canvas.getContext("2d");
  ctx.fillText("Stream terminated",10,50);
  ctx.font="30px Verdana";
  ctx.fillStyle = "#ffffff";
}













/*
postRequestStreamOne.onreadystatechange = function() {
  if (postRequestStreamOne.readyState == 2 && postRequestStreamOne.status == 404)
    console.log('404');

  if (postRequestStreamOne.readyState == 3)
    console.log('State 3 ' + postRequestStreamOne.statusText + ' and ' + postRequestStreamOne.status);

  if (postRequestStreamOne.readyState == 4 && postRequestStreamOne.status == 200 && postRequestStreamOne.statusText == 'OK') {
    console.log('stream selected');
  }
};
*/
