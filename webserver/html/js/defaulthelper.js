"use strict";
var getInterval                   = null;
var streamSelected                = false;

document.addEventListener('DOMContentLoaded', function() {
  checkForFullscreen();
  getInterval = setInterval(function(){ getTestData(); }, 1000);
  initialiseUserInfoModal();
  addResizeEventListener();
  window.onbeforeunload = function() {
    clearRequests();
  };

  var streamButton = document.getElementById('streamSelect');
  streamButton.addEventListener('mouseenter', function() {
    streamSelected = true;
  });
  streamButton.addEventListener('mouseleave', function() {
    streamSelected = false;
  });
});

// TODO -- Werte umrechnen modal
// TODO -- Umrechnung von Bildern verbessern z.B. über übermittelte Geometrie?
// TODO -- Art Overview zu zeichnen verbessern

var currentSession                = null;
var data                          = null;
var stopGetStream                 = false;
var lastKnownOverlayImagepath     = null;
var overlayImageDrawPositionX     = null;
var overlayImageDrawPositionY     = null;
var currentlySelectedStream       = "overview";
var imageModifikator              = 0;
var startDrawingWidthAt           = 0;
var startDrawingHeightAt          = 0;
var displayBlocked                = false;
var initialised                   = false;

// handling requests variables

// -- unique requests
var getRequestInitArray = [];
var postRequestOverviewArray = [];
var postRequestStreamSelectArray = [];
// -- non unique requests
var postRequestStreamEventArray = [];
// -- all requests
var allRequestsArray = [getRequestInitArray,postRequestOverviewArray,postRequestStreamSelectArray,postRequestStreamEventArray];

function getTestData() {
  if (currentSession === null) {
    var getRequestInit = new XMLHttpRequest();
    getRequestInit.open('GET', '/api/init.sctx', true);
    handleRequest(getRequestInit,getRequestInitArray,true);
    //console.debug("Init " + getRequestInitArray);

    getRequestInit.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        getRequestInitArray = [];
        initialised = true;
        console.log('initialising succeeded');
        clearInterval(getInterval);
        data = JSON.parse(this.response);
        currentSession = data.session;
        setInterval(checkIfStreamSelected, 5000);
        buildOverview(data);
        fillSelectWithStreams(data);
        fillUserInfoModal(data);

      } else
        displayGeneralWarning('We reached our target server, but it returned an error. Please refresh the page to try again');
    };
    getRequestInit.onerror = function() {
      displayGeneralWarning('There was a connection error of some sort. Please reload the page.');
    };
    /*if (postRequestOverviewArray.length > 0 || postRequestStreamSelectArray .length > 0 )
      wait();*/
    getRequestInit.send();
  }
  else
    displayGeneralWarning('not initialised');
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
  var heightDifference         = (canvasHeight - sessionHeight)*format;
  var heightDifferenceNegative = (sessionHeight - canvasHeight)*format;
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
      startDrawingHeightAt = 0;
      startDrawingWidthAt = 0;
      imageModifikator = 1;
    }
  }
}

function buildOverview(data) {

  if(window.innerHeight < 400 || window.innerWidth < 555){
    displayResizeWarning();
    return;
  }

  if(displayBlocked === true)
    document.body.removeChild(document.getElementById('displayResizeWarning'));
    displayBlocked = false;

  var testDiv = document.getElementById('testDiv');
  var previewSizeModifikator = 1;
  var previewSizeModifikatorWidth = 1;
  var previewSizeModifikatorHeight = 1;
  var totalPreviewWidth = 0;
  var totalPreviewHeight = 0;

  testDiv.innerHTML = '';
  testDiv.addEventListener('mouseenter', function() {
    streamSelected = true;
  });
  testDiv.addEventListener('mouseleave', function() {
    streamSelected = false;
  });

  Array.prototype.forEach.call(data.streams, function(stream){
    totalPreviewWidth = totalPreviewWidth + stream.previewWidth;
    totalPreviewHeight = totalPreviewHeight + stream.previewHeight;
  });

  testDiv.style.top = window.innerHeight/2 + "px";
  testDiv.style.left = window.innerWidth/2 + "px";

  if (totalPreviewWidth > window.innerWidth - 200) {
    previewSizeModifikatorWidth = (window.innerWidth- 200)/totalPreviewWidth;
  }
  if (totalPreviewHeight > window.innerHeight - 200) {
    previewSizeModifikatorHeight = (window.innerHeight - 200)/totalPreviewHeight;
  }
  if (previewSizeModifikatorHeight < previewSizeModifikatorWidth)
    previewSizeModifikator = previewSizeModifikatorHeight;
  else if (previewSizeModifikatorHeight > previewSizeModifikatorWidth)
    previewSizeModifikator = previewSizeModifikatorWidth;

  Array.prototype.forEach.call(data.streams, function(stream, i){
    var newDiv = document.createElement('div');
    var newImage = new Image(stream.previewWidth*previewSizeModifikator,stream.previewHeight*previewSizeModifikator);
    var newInfoContainer = document.createElement('div');
    var newInfoContainerFontSize = 30;
    var primaryInfoFontSize = 30;
    var newInfoHeading = document.createElement('h3');
    var newInfoNumber = document.createElement('p');
    var newInfoText = document.createElement('p');
    var newInfoFormat = document.createElement('p');
    var formatResult = "";
    var counter = 0;

    if (stream.primary === true)
      if (newDiv.classList)
        newDiv.classList.add('primaryScreen');
      else
        newDiv.className += 'primaryScreen';

    newDiv.style.position = 'absolute';
    newDiv.style.top = (stream.top / (stream.height/stream.previewHeight))*previewSizeModifikator + 'px';
    newDiv.style.left = (stream.left / (stream.height/stream.previewHeight))*previewSizeModifikator + 'px';

    newImage.src = "data:image/gif;base64,"+ stream.previewData;
    newImage.style.position = "relative";
    newImage.style.zIndex = 2;
    newImage.addEventListener('click', function() {
      counter = i+1;
      document.getElementById('streamSelect').value = counter;
      selectStream("" + counter);
    });

    if (newInfoContainer.classList)
      newInfoContainer.classList.add('infoContainer');
    else
      newInfoContainer.className += 'infoContainer';

    if (newDiv.classList.contains('primaryScreen')) {
        var newPrimaryInfo = document.createElement('h2');
        newPrimaryInfo.innerHTML = 'Primary Display';
        newInfoContainer.appendChild(newPrimaryInfo);
        newPrimaryInfo.style.fontSize = primaryInfoFontSize * previewSizeModifikator + 'px';
      }

    newInfoContainer.style.fontSize = newInfoContainerFontSize * previewSizeModifikator + "px";
    newInfoNumber.innerHTML = "Stream " + (i+1);
    newInfoNumber.style.marginBottom = "10px";
    newInfoFormat.style.marginTop = "10px";
    newInfoHeading.innerHTML = "Resolution";
    newInfoText.innerHTML = stream.width + "x" + stream.height;

    switch((Math.round(stream.width/stream.height * 100) / 100) + '' ) {
      case '1':
          formatResult = "square";
          break;
      case '1.25':
          formatResult = "5:4";
          break;
      case '1.33':
          formatResult = "4:3";
          break;
      case '1.5':
          formatResult = "3:2";
          break;
      case '1.6':
          formatResult = "16:10";
          break;
      case '1.67':
          formatResult = "15:9";
          break;
      case '1.78':
          formatResult = "16:9";
          break;
      case '2.33':
          formatResult = "21:9";
          break;
      case '2.35':
          formatResult = "Cinamascope";
          break;
      case '2.37':
          formatResult = "21:9";
          break;
      case '2.39':
          formatResult = "Panavision";
          break;
      default:
          formatResult = "";
    }
    newInfoFormat.innerHTML = formatResult;

    newInfoContainer.appendChild(newInfoNumber);
    newInfoContainer.appendChild(newInfoHeading);
    newInfoContainer.appendChild(newInfoText);
    newInfoContainer.appendChild(newInfoFormat);
    newDiv.appendChild(newInfoContainer);
    newDiv.appendChild(newImage);
    testDiv.appendChild(newDiv);
  });
  console.log('Overview Updated');
}

function getOverview() {
  var postRequestOverview = new XMLHttpRequest();
  postRequestOverview.open('POST', ' /api/overview.sctx', true);
  postRequestOverview.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
  handleRequest(postRequestOverview,postRequestOverviewArray,true);
  //console.debug("Overview " + postRequestOverviewArray);
  if (postRequestStreamSelectArray.length > 0 || getRequestInitArray .length > 0 )
    postRequestOverview.send('session=' + currentSession);

  postRequestOverview.onload = function() {
    if (this.status >= 200 && this.status < 400) {
      postRequestOverviewArray = [];
      var data = JSON.parse(this.response);
      buildOverview(data);
    }
    else if (this.status === 410) {
      displayGeneralWarning("Session dismissed. Please close any additional executing Web App and reload the page.");
    }
    else {
      console.log('Failed to load Overview' + this.status);
    }
  };
  postRequestOverview.onerror = function() {
    displayGeneralWarning("Session outdated. Please close any additional executing Web App and reload the page.");
  };
}

function selectStream(stream) {

  clearRequests();
  stopGetStream = true;
  currentlySelectedStream = stream;

  if (stream !== "overview") {
    streamSelected = true;

    document.getElementById('overlayCanvas').style.display = 'block';
    document.getElementById('streamCanvas').style.display = 'block';

    stream = stream -1;
    var postRequestStreamSelect = new XMLHttpRequest();
    postRequestStreamSelect.open('POST', ' /api/select.sctx', true);
    postRequestStreamSelect.setRequestHeader('Content-Type', 'text/html; charset=utf-8');
    handleRequest(postRequestStreamSelect,postRequestStreamSelectArray,true);
    //console.debug("Select " + postRequestStreamSelectArray);
    /*if (postRequestOverviewArray.length > 0 || getRequestInitArray .length > 0 )
      wait();*/
    if (postRequestStreamSelectArray.length > 0)
    postRequestStreamSelect.send('session=' + currentSession +'&stream=' + stream);

    postRequestStreamSelect.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        postRequestStreamSelectArray = [];
        buildCanvas(stream);
        resetCanvas();
        stopGetStream = false;
        getStream();
      }
      else if ((this.status === 409))
        displayGeneralWarning('Failed to select Stream ' + stream + '. Please reload the page');
      else if ((this.status === 410))
        displayGeneralWarning('Invalid session' + currentSession + '. Please reload the page');
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
  var postRequestStreamEvent = new XMLHttpRequest();
  postRequestStreamEvent.open('POST', '/api/event.sctx', true);
  postRequestStreamEvent.setRequestHeader('Content-Type', 'application/json;');
  handleRequest(postRequestStreamEvent,postRequestStreamEventArray,false);
  //console.debug("Event " + postRequestStreamEventArray);
  postRequestStreamEvent.send('session=' + currentSession);

  postRequestStreamEvent.onload = function() {

    if (this.status >= 200 && this.status < 400) {
      console.log(postRequestStreamEventArray.length);
      var index = postRequestStreamEventArray.indexOf(postRequestStreamEvent);
      if (index > -1) {
          postRequestStreamEventArray.splice([index], 1);
      }
      console.log(postRequestStreamEventArray.length);
      var streamData = this.response;
      var parsedStreamData = JSON.parse(streamData);

      if (parsedStreamData.commands.length !== 0) {

        for (var i = 0; i < parsedStreamData.commands.length; i++) {

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
                    displayGeneralWarning('Stream terminated. Please reload the Page');
                    return;
                default:
                    console.log('no streamcommand ommited');
                    break;
            }
          }
        }
      }
      if (stopGetStream === false)
        setTimeout(function(){getStream();},10);
    }
    else {
      displayGeneralWarning('Failed to get Stream. Please restart sctx and reload the page.');
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
  overlayImageDrawPositionX = overlayPositionX-(32*(1/imageModifikator));
  overlayImageDrawPositionY = overlayPositionY-(32*(1/imageModifikator));
  drawOverlay();
}

function drawOverlay() {
  if (lastKnownOverlayImagepath !== null) {
    var context = document.getElementById('overlayCanvas');
    var contextDraw = context.getContext('2d');
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
  buildOverview(data);
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
      if (event.target === modal) {
          modal.style.display = "none";
      }
  };
}

function fillUserInfoModal() {

  var modalBody = document.getElementById('userInfoContent');

  for(var firstLevelInfo in data.system){
    if (data.system.hasOwnProperty(firstLevelInfo)){
      if (firstLevelInfo === "bus"){
        continue;
      }
      else if (firstLevelInfo === "domain" || firstLevelInfo === "user" || firstLevelInfo === "host") {
        var newHeaderInfo = document.createElement('span');
        var newHeadingInfoIcon = document.createElement('i');
        newHeadingInfoIcon.classList.add('fa');
        var headerIcon = null;
        switch(firstLevelInfo) {
          case 'user':
              headerIcon = ' fa-user';
              break;
          case 'host':
              headerIcon = ' fa-home';
              break;
          case 'domain':
              headerIcon = ' fa-sitemap';
              break;
          default:
              headerIcon = ' fa-minus';
              break;
            }

        newHeadingInfoIcon.className += headerIcon;
        newHeaderInfo.innerHTML = data.system[firstLevelInfo].toLowerCase() + " ";
        document.getElementById('modalHeaderUserInfo').appendChild(newHeadingInfoIcon);
        document.getElementById('modalHeaderUserInfo').appendChild(newHeaderInfo);
        continue;
      }

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
      case 'drives':
          icon = ' fa-hdd-o';
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

          if (data.system[firstLevelInfo].hasOwnProperty(secondLevelInfo)){
            var tempDataMemory = null;
            var tempDataDisplay = null;

            if (firstLevelInfo === "keyboard" && (secondLevelInfo === "layout" || secondLevelInfo === "info"))
              continue;
            if (firstLevelInfo === "memory" && (secondLevelInfo === "total" || secondLevelInfo === "available"))
              tempDataMemory = Math.ceil(data.system[firstLevelInfo][secondLevelInfo]/1024/1024/1024);
            if (firstLevelInfo === "displayAdapter" && secondLevelInfo === "ram")
              tempDataDisplay = Math.ceil(data.system[firstLevelInfo][secondLevelInfo]/1024/1024/1024);

            var newInfoBlockSecondLevel = document.createElement('div');
            var newHeadingSecondLevel = document.createElement('h2');
            var newParagraphSecondLevel = document.createElement('p');

            newInfoBlockSecondLevel.classList.add('infoBlockSecondLevel');
            newHeadingSecondLevel.classList.add('headingSecondLevel');
            newParagraphSecondLevel.classList.add('paragraphSecondLevel');

            newInfoBlock.appendChild(newInfoBlockSecondLevel);

            if (typeof(data.system[firstLevelInfo][secondLevelInfo]) === 'object'){
              for(var thirdLevelInfo in data.system[firstLevelInfo][secondLevelInfo]){
                if (data.system[firstLevelInfo][secondLevelInfo].hasOwnProperty(thirdLevelInfo)) {
                  var newParagraphThirdLevel = document.createElement('p');

                  newParagraphThirdLevel.classList.add('paragraphThirdLevel');
                  newParagraphThirdLevel.innerHTML = data.system[firstLevelInfo][secondLevelInfo][thirdLevelInfo];
                  if (newParagraphThirdLevel.innerHTML !== "")
                    newInfoBlock.appendChild(newParagraphThirdLevel);
                }
              }
            }
            newHeadingSecondLevel.innerHTML = secondLevelInfo;
            if (tempDataMemory)
              newParagraphSecondLevel.innerHTML = tempDataMemory + " GB";
            else if (tempDataDisplay)
              newParagraphSecondLevel.innerHTML = tempDataDisplay + " GB";
            else
              newParagraphSecondLevel.innerHTML = data.system[firstLevelInfo][secondLevelInfo];
            newInfoBlockSecondLevel.appendChild(newHeadingSecondLevel);

            if (typeof(data.system[firstLevelInfo][secondLevelInfo]) !== 'object')
              newInfoBlockSecondLevel.appendChild(newParagraphSecondLevel);
          }
        }
      }
      modalBody.appendChild(newInfoBlockWrapper);
    }
   }
}

// https://developer.mozilla.org/de/docs/Web/Events/resize
function addResizeEventListener() {

  window.addEventListener("resize", resizeThrottler, false);

  var resizeTimeout;
  function resizeThrottler() {
    // ignore resize events as long as an actualResizeHandler execution is in the queue
    if ( !resizeTimeout ) {
      resizeTimeout = setTimeout(function() {
        resizeTimeout = null;
        actualResizeHandler();

     }, 500);
    }
  }

  function actualResizeHandler() {
    if (currentlySelectedStream !== null && currentlySelectedStream !== "overview") {
      checkForFullscreen();
      selectStream(currentlySelectedStream);
    }
    else if (currentlySelectedStream !== null && currentlySelectedStream === "overview"){
      buildOverview(data);
    }
  }
}

function resetCanvas() {
  var resetCanvas = document.getElementById('streamCanvas');
  var resetCanvasContext = resetCanvas.getContext('2d');
  resetCanvasContext.fillStyle = '#000000';
  resetCanvasContext.fillRect(0, 0, resetCanvas.width, resetCanvas.height);
}
/*
function displayTerminatedMessage() {
  resetCanvas();
  var canvas = document.getElementById("streamCanvas");
  var ctx = canvas.getContext("2d");
  ctx.fillText("Stream terminated",10,50);
  ctx.font="30px Verdana";
  ctx.fillStyle = "#ffffff";
}*/

function displayResizeWarning() {
  if (displayBlocked === true)
    return;

  var newBlockDiv = document.createElement('div');
  newBlockDiv.style.position = 'fixed';
  newBlockDiv.id = "displayResizeWarning";
  newBlockDiv.style.top = 0;
  newBlockDiv.style.left = 0;
  newBlockDiv.style.zIndex = 100;
  newBlockDiv.style.height = "100%";
  newBlockDiv.style.width = "100%";
  newBlockDiv.style.backgroundColor = "orange";
  newBlockDiv.style.fontSize = "30px";
  newBlockDiv.style.color = "white";
  newBlockDiv.style.fontWeight = "600";
  newBlockDiv.style.padding = "20px";
  newBlockDiv.innerHTML = "Please increase the size of your browser window";
  document.body.appendChild(newBlockDiv);
  document.body.style.overflow = "hidden";
  displayBlocked = true;
}

function checkForFullscreen() {
    if (screen.height === window.innerHeight)
      console.log("fullscreen");
    else if (screen.height !== window.innerHeight)
      console.log("not fullscreen");
}

function handleRequest(request,requestArray,unique) {
  if (unique === true){
    if (requestArray.length !== 0){
      requestArray[0].abort();
      requestArray = [];
    }
  }
  requestArray.push(request);
}

function clearRequests() {
  for (var i = 0; i < allRequestsArray.length; i++) {
    var specificRequestArray = allRequestsArray[i];
    for (var j = 0; j < specificRequestArray.length; j++) {
      allRequestsArray[i][j].abort();
    }
  }
  allRequestsArray = [];
}

function displayGeneralWarning(warningtext) {
  var newBlockDiv = document.createElement('div');
  newBlockDiv.style.position = 'fixed';
  newBlockDiv.style.top = 0;
  newBlockDiv.style.left = 0;
  newBlockDiv.style.zIndex = 100;
  newBlockDiv.style.height = "100%";
  newBlockDiv.style.width = "100%";
  newBlockDiv.style.backgroundColor = "orange";
  newBlockDiv.style.fontSize = "30px";
  newBlockDiv.style.color = "white";
  newBlockDiv.style.fontWeight = "600";
  newBlockDiv.style.padding = "20px";
  newBlockDiv.innerHTML = warningtext;
  document.body.appendChild(newBlockDiv);
  document.body.style.overflow = "hidden";
}

/*
function wait() {
  setTimeout(function(){
    console.log('waiting');
  },500);
}
*/
