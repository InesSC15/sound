
// collect DOMs
const display = document.querySelector('.display')
const controllerWrapper = document.querySelector('.controllers')

const State = ['Initial', 'Record', 'Download']
let stateIndex = 0
let mediaRecorder, chunks = [], audioURL = ''

// mediaRecorder setup for audio
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    console.log('mediaDevices supported..')

    navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(stream => {
        mediaRecorder = new MediaRecorder(stream)

        mediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data)
        }
        mediaRecorder.onstop = () => {
            console.log(chunks);
            const blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'})
            let blo = blob
            console.log(blo);
            /////////////
            let fileReader = new FileReader();
            const audioContext = new AudioContext()
            let arrayBuffer;

            fileReader.onloadend = () => {
                arrayBuffer = fileReader.result 

                // Convert array buffer into audio buffer
                audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
            
                  // Do something with audioBuffer
                  console.log(audioBuffer)
                 prepare(audioBuffer)

            
                })
            }

            fileReader.readAsArrayBuffer(blo);
            console.log(blo)
            ///////////
            chunks = []
            // audioURL = window.URL.createObjectURL(blob)
            // document.querySelector('audio').src = audioURL

        }
    }).catch(error => {
        console.log('Following error has occured : ',error)
    })
}else{
    stateIndex = ''
    application(stateIndex)
}

const clearDisplay = () => {
    display.textContent = ''
}

const clearControls = () => {
    controllerWrapper.textContent = ''
}

const record = () => {
    stateIndex = 1
    mediaRecorder.start()
    application(stateIndex)
}

const stopRecording = () => {
    stateIndex = 2
    mediaRecorder.stop()
    application(stateIndex)
}

const downloadAudio = () => {
    const downloadLink = document.createElement('a')
    downloadLink.href = audioURL
    downloadLink.setAttribute('download', 'audio')
    downloadLink.click()
}

const addButton = (id, funString, text) => {
    const btn = document.createElement('button')
    btn.id = id
    btn.setAttribute('onclick', funString)
    btn.textContent = text
    controllerWrapper.append(btn)
}

const addMessage = (text) => {
    const msg = document.createElement('p')
    msg.textContent = text
    display.append(msg)
}

const addAudio = () => {
    const audio = document.createElement('audio')
    audio.controls = true
    audio.src = audioURL
    display.append(audio)
}

const application = (index) => {
    switch (State[index]) {
        case 'Initial':
            clearDisplay()
            clearControls()

            addButton('record', 'record()', 'Start Recording')
            break;

        case 'Record':
            clearDisplay()
            clearControls()

            addMessage('Recording...')
            addButton('stop', 'stopRecording()', 'Stop Recording')
            break

        case 'Download':
            clearControls()
            clearDisplay()

            addAudio()
            addButton('record', 'record()', 'Record Again')
            break

        default:
            clearControls()
            clearDisplay()

            addMessage('Your browser does not support mediaDevices')
            break;
    }

}

application(stateIndex)


//////////////////////////////////////////////////////////////////////////

const recorder = document.getElementById('recorder');
const player = document.getElementById('player');



function prepare(buffer) {
    console.log(buffer)
var offlineContext = new OfflineAudioContext(1, buffer.length, 48000);
var source = offlineContext.createBufferSource();
source.buffer = buffer;
var filter = offlineContext.createBiquadFilter();
filter.type = "lowpass";
source.connect(filter);
filter.connect(offlineContext.destination);
source.start(0);
offlineContext.startRendering();
offlineContext.oncomplete = function(e) {
process(e,buffer.sampleRate);
};
}

function process(e,rate) {
var filteredBuffer = e.renderedBuffer;
//If you want to analyze both channels, use the other channel later
var data = filteredBuffer.getChannelData(0);
var max = arrayMax(data);
var min = arrayMin(data);
var threshold = min + (max - min) * 0.95;
// var threshold = min + (max - min) * 0.85;
var peaks = getPeaksAtThreshold(data, threshold);
var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
var tempoCounts = groupNeighborsByTempo(intervalCounts,rate);
tempoCounts.sort(function(a, b) {
return b.count - a.count;
});
console.log(tempoCounts[0])
if (tempoCounts.length) {
output.innerHTML = tempoCounts[0].tempo;
}
}

// http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
function getPeaksAtThreshold(data, threshold) {
var peaksArray = [];
var length = data.length;
for (var i = 0; i < length;) {
if (data[i] > threshold) {
peaksArray.push(i);
// Skip forward ~ 1/4s to get past this peak.
i += 10000;
}
i++;
}
return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
var intervalCounts = [];
peaks.forEach(function(peak, index) {
for (var i = 0; i < 10; i++) {
var interval = peaks[index + i] - peak;
var foundInterval = intervalCounts.some(function(intervalCount) {
  if (intervalCount.interval === interval) return intervalCount.count++;
});
//Additional checks to avoid infinite loops in later processing
if (!isNaN(interval) && interval !== 0 && !foundInterval) {
  intervalCounts.push({
    interval: interval,
    count: 1
  });
}
}
});
return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts,rate) {
var tempoCounts = [];
intervalCounts.forEach(function(intervalCount) {
//Convert an interval to tempo
var theoreticalTempo = 60 / (intervalCount.interval / rate);
theoreticalTempo = Math.round(theoreticalTempo);
if (theoreticalTempo === 0) {
return;
}
// Adjust the tempo to fit within the 90-180 BPM range
while (theoreticalTempo < 80) theoreticalTempo *= 2;
while (theoreticalTempo > 160) theoreticalTempo /= 2;

var foundTempo = tempoCounts.some(function(tempoCount) {
if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
});
if (!foundTempo) {
tempoCounts.push({
  tempo: theoreticalTempo,
  count: intervalCount.count
});
}
});
return tempoCounts;
}

// http://stackoverflow.com/questions/1669190/javascript-min-max-array-values
function arrayMin(arr) {
var len = arr.length,
min = Infinity;
while (len--) {
if (arr[len] < min) {
min = arr[len];
}
}
return min;
}

function arrayMax(arr) {
var len = arr.length,
max = -Infinity;
while (len--) {
if (arr[len] > max) {
max = arr[len];
}
}
return max;
}