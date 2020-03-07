const fs = require('fs')
const { ipcRenderer } = require('electron')

const getNode = (key, value) => {
  if (key == "class") {
    return document.getElementsByClassName(value)
  } else if (key == "id") {
    return document.getElementById(value)
  }
}
const getWidth = (node) => {
  return parseFloat(getComputedStyle(node, false).width)
}
const getHeight = (node) => {
  return parseFloat(getComputedStyle(node, false).height)
}

class Music {
  constructor() {
    //init context
    try {
      this.context = new AudioContext()
    } catch (e) {
      throw new Error("please use chrome instead")
    }
    this.musicFolder = "./media/"

    this.initAudio()
    this.initWidgt()
    this.visulOption = {
      type: 'circle',
      color: 'rgb(255,200,200)',
      shadowColor: 'rgb(255,220,220)',
      shadowSize: 0,
      lineWidth: 7,
      spaceBetween: 3,
      speed: 5,
      textSize: 16,
      textBetween: 8,
      textColor: 'rgb(255,255,255)',
      textShadow: 2
    }
  }
  initAudio() {
    this.processor = this.context.createScriptProcessor(1024)
    this.analyser = this.context.createAnalyser()
    this.audio = new Audio()
    this.index = 0
    this.lrcTimeArray = []
    this.lrcStrArray = []

    //create media element
    this.music = this.context.createMediaElementSource(this.audio)

    //processor connect
    this.processor.connect(this.context.destination)
    //analyser connect to processor
    this.analyser.connect(this.processor)
    //define a byte stream to analyse the data

    //music connect
    this.music.connect(this.analyser)
    this.music.connect(this.context.destination)

    this.audioOption = {
      defaultVolume: 0.3
    }
  }
  initWidgt() {
    //init nodes
    this.musicPlayer = getNode("class", "music-player")[0]
    this.listPanel = getNode('class', 'list-panel')[0]
    this.toolPanel = getNode('class', "tool-panel")[0]
    this.canvas = getNode('id', 'canvas')
    this.canvasCtx = canvas.getContext('2d')
    this.slider = getNode('id', 'slider')
    this.volume = getNode('id', 'volume')
    this.prevBtn = getNode('id', 'prev-btn')
    this.playBtn = getNode('id', 'play-btn')
    this.nextBtn = getNode('id', 'next-btn')
    this.switchBtn = getNode('id', 'switch-visul-btn')
    this.minBtn = getNode('id', 'minimize-btn')
    this.maxBtn = getNode('id', 'maximize-btn')
    this.closeBtn = getNode('id', 'close-btn')

    //init medias
    fs.readFile('./config/user-data.json', (err, data) => {
      if (err) {throw err}
      this.musicFolder = JSON.parse(data).musicFolder
      this.updateMediaList()
    })


    //init widget
    this.slider.value = 0
    this.volume.value = this.audioOption.defaultVolume
    this.audio.volume = this.volume.value
    this.switchBtn.onclick = () => {
      if (this.visulOption.type == "circle") {
        this.visulOption.type = "bar"
      } else {
        this.visulOption.type = "circle"
      }
    }

    ipcRenderer.on('open-files', (err, files) => {
      let list = []
      files.forEach((file) => {
        const pathAndName = file.replace(/\\/g, "\/")

        const pathRE = /.*\//
        const pathStr = pathRE.exec(pathAndName)[0]
        list.push({
          path: pathAndName,
          name: pathAndName.replace(pathStr, '')
        })
      })
      this.copyFileFromList(list)
    })
    ipcRenderer.on('modify-music-folder', (err, dir) => {
      this.modifyMusicFolder(dir)
    })

    this.minBtn.onclick = () => {
      ipcRenderer.send('window-min')
    }
    this.maxBtn.onclick = () => {
      ipcRenderer.send('window-max')
    }
    this.closeBtn.onclick = () => {
      ipcRenderer.send('window-close')
    }
    this.listPanel.oncontextmenu = (e) => {
      e.preventDefault()
      e.stopPropagation()
      ipcRenderer.send('list-panel-menu')
    }
    this.canvas.oncontextmenu = (e) => {
      e.preventDefault()
      e.stopPropagation()
      ipcRenderer.send('canvas-menu')
    }
    this.musicPlayer.ondragover = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.listPanel.style.boxShadow = "-3px 0px 5px 0px rgb(255,200,200) inset"
    }
    this.musicPlayer.ondragleave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.listPanel.style.boxShadow = "-3px 0px 5px 0px rgba(0,0,0,0.2) inset"
    }
    this.musicPlayer.ondrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log(e)
      this.listPanel.style.boxShadow = "-3px 0px 5px 0px rgba(0,0,0,0.2) inset"
      this.copyFileFromList(e.dataTransfer.files)
    }

    this.volume.oninput = () => {
      this.audio.volume = this.volume.value
    }
    this.slider.oninput = () => {
      this.audio.currentTime = this.slider.value
    }
    this.playBtn.onclick = () => {
      if (this.audio.src == '') {
        this.loadAudio()
        this.loadLRC()
      } else if (this.audio.paused) {
        this.audio.play()
        this.playBtn.style.backgroundImage = "url('./img/pause.png')"
      } else if (!this.audio.paused) {
        this.audio.pause()
        this.playBtn.style.backgroundImage = "url('./img/play.png')"
      }
    }
    this.prevBtn.onclick = () => {
      if (this.index > 0) {
        this.index--
      } else {
        this.index = this.medias.length - 1
      }
      this.switchSelectedItem()
      this.loadAudio()
      this.loadLRC()
    }
    this.nextBtn.onclick = () => {
      if (this.index < this.medias.length - 1) {
        this.index++
      } else {
        this.index = 0
      }
      this.switchSelectedItem()

      this.loadAudio()
      this.loadLRC()

    }
    this.resizeWidget()

    //onresize
    window.onresize = () => { this.resizeWidget() }
  }
  resizeWidget() {
    //canvas
    this.canvas.width = getWidth(this.musicPlayer) - getWidth(this.listPanel)
    this.canvas.height = getHeight(this.musicPlayer) - getHeight(this.toolPanel)
  }
  loadAudio() {
    console.log("loading... " + this.medias[this.index])
    this.audio.src = this.musicFolder + this.medias[this.index]
    // this.loadLRC()
    //on canplay
    this.audio.oncanplay = () => {
      //set slider
      this.slider.max = this.audio.duration
      this.slider.value = 0
      this.audio.play()
      this.playBtn.style.backgroundImage = "url('./img/pause.png')"
      this.visulizeAudio()
    }
    //on ended
    this.audio.onended = () => {
      // this.music.disconnect()
      // this.music=null
      // this.processor.onaudioprocess=()=>{}

      //play next sound

      if (this.index < this.medias.length - 1) {
        this.index++
      } else {
        this.index = 0
      }

      this.loadAudio()
      this.loadLRC()
    }
  }
  visulizeAudio() {
    requestAnimationFrame(() => {
      this.visulizeAudio()
    })

    //update slider
    this.slider.value = this.audio.currentTime

    //update canvas

    //a buffer to get data
    this.data = new Uint8Array(this.analyser.frequencyBinCount)
    //store data to buffer
    this.analyser.getByteTimeDomainData(this.data)
    //clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    switch (this.visulOption.type) {
      case 'bar':
        this.visulizeBar()
        break
      case 'circle':
        this.visulizeCircle()
        break
    }
    this.displayLRC()
  }
  loadLRC() {
    this.lrcTimeArray.length = 0
    this.lrcStrArray.length = 0
    try {
      const lrcFileName = this.medias[this.index].replace(".mp3", ".lrc")
      const exists = fs.existsSync(this.musicFolder + lrcFileName);
      if(!exists) {return}
      const lrc = fs.readFileSync(this.musicFolder + lrcFileName, 'utf8');
      let lrcLines = lrc.split('\n').map(l=>l.trim()).filter(l=>!!l);
      const lrcArray = lrcLines.map(l=>{
        if(/^(\[\d+\:\d{2}\.\d{2}\])(.*?)$/.test(l)){
            const [__,timeStr, str] = [.../^\[(\d+\:\d{2}\.\d{2})\](.*?)$/.exec(l)]
            const [___, min, sec] = /(\d+)\:(\d{2}.\d{2})/.exec(timeStr)
            const time = parseFloat(min * 60 + sec);
            return {time,str}
         } else if(/^\[(.*?)\]$/.test(l)){
            const [__,str,time] = [.../^\[(.*?)\]$/.exec(l), 0]
            return {time,str}
         } else {
           return {time:0, str: '...'}
         }
      })
      this.lrcTimeArray = lrcArray.map(lrc=>lrc.time)
      this.lrcStrArray = lrcArray.map(lrc=>lrc.str)
      
    } catch (error){
      console.error(error);
    }
  }
  modifyMusicFolder(newPath) {
    this.musicFolder = newPath
    this.updateMediaList()
    const userData = {
      "musicFolder": this.musicFolder
    }
    fs.writeFile('./config/user-data.json', JSON.stringify(userData), (err) => {
      if (err) {
        throw err
      }
    })
  }
  copyFileFromList(list) {
    list.forEach(f => {
      try {
        const exists = fs.existsSync(this.musicFolder + f.name)
        if (exists){return}
        const file = fs.readFileSync(f.path)
        fs.writeFileSync(this.musicFolder + f.name, file)
        this.medias.push(f.name)
        this.updateMediaList() 
      } catch (error) {
        console.error(error)
      }
    })

  }
  switchSelectedItem() {
    getNode("class", "selected")[0].classList.remove("selected")
    getNode("class", "media-item")[this.index].classList.add("selected")
  }
  updateMediaList() {
    let medias = []
    fs.readdir(this.musicFolder, (err, files) => {
      (files || []).forEach((file) => {
        if (file.indexOf(".mp3") > 0) {
          medias.push(file)
        }
      })
      this.medias = medias
      this.listPanel = getNode("class", "list-panel")[0]
      this.listPanel.innerHTML = ""
      this.medias.map((media,i) => {
        let node = document.createElement('div')
        node.innerHTML = media.split(".")[0]
        node.classList.add("media-item")
        if (i == 0) {
          node.classList.add("selected")
        }
        node.onclick = () => {
          //load audio
          this.index = i
          this.switchSelectedItem()
          this.loadAudio()
          this.loadLRC()
        }
        this.listPanel.appendChild(node)
      });
    })
  }
  visulizeBar() {
    // let step=(parseInt(this.data.length/360)*4)
    let barTotalWidth = (this.visulOption.spaceBetween + this.visulOption.lineWidth)
    let barNum = parseInt(this.canvas.width / barTotalWidth)
    let step = parseInt(this.data.length / barNum)
    let offset = (this.canvas.width - barNum * barTotalWidth) / 2
    let barHeight = this.canvas.height / 4

    this.canvasCtx.fillStyle = this.visulOption.color
    for (let i = 0;i < barNum;i++) {
      this.canvasCtx.fillRect(
        offset + i * barTotalWidth,
        this.canvas.height / 2,
        this.visulOption.lineWidth,
        -barHeight * (this.data[i * step] - 128) / 128 / this.volume.value
      )
    }
  }
  visulizeCircle() {
    let radius = 10
    let perAngle = Math.PI * 2 / 360
    if (this.canvas.height > this.canvas.width) {
      radius = this.canvas.width / 4
    } else {
      radius = this.canvas.height / 4
    }
    this.canvasCtx.shadowOffsetX = 0
    this.canvasCtx.shadowOffsetY = 0
    this.canvasCtx.shadowColor = this.visulOption.shadowColor
    this.canvasCtx.shadowBlur = this.visulOption.shadowSize
    for (let i = 0;
      i < this.data.length;
      i += parseInt(this.data.length / 360) * 2
    ) {
      let lineLength = radius * ((this.data[i] - 128) / 128) / this.volume.value + this.visulOption.lineWidth / 2

      this.canvasCtx.strokeStyle = this.visulOption.color
      this.canvasCtx.lineWidth = this.visulOption.lineWidth
      this.canvasCtx.beginPath()
      this.canvasCtx.moveTo(
        this.canvas.width / 2,
        this.canvas.height / 2
      )
      this.canvasCtx.lineTo(
        this.canvas.width / 2 +
        Math.sin(perAngle * (i - this.visulOption.speed * this.audio.currentTime)) * (radius + lineLength),
        this.canvas.height / 2 +
        Math.cos(perAngle * (i - this.visulOption.speed * this.audio.currentTime)) * (radius + lineLength),
      )
      this.canvasCtx.closePath()
      this.canvasCtx.stroke()
    }
    this.canvasCtx.shadowBlur = 0
    this.canvasCtx.lineWidth = 0

    this.canvasCtx.globalCompositeOperation = 'destination-out'
    this.canvasCtx.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      radius,
      0,
      Math.PI * 2, true)
    this.canvasCtx.fill()
    this.canvasCtx.globalCompositeOperation = 'source-over'

  }
  displayLRC() {
    const formatTime = (sec) => {
      const res = Math.floor(sec / 60) + ':' + Math.floor(sec % 60)
      return res
    }
    const displayTime = formatTime(this.audio.currentTime) + ' / ' + formatTime(this.audio.duration)

    this.canvasCtx.textAlign = "center"
    this.canvasCtx.fillStyle = this.visulOption.textColor
    this.canvasCtx.shadowBlur = this.visulOption.textShadow
    this.canvasCtx.shadowColor = 'rgb(0,0,0)'

    //display time
    this.canvasCtx.font = this.visulOption.textSize / 5 * 4 + "px Arial"
    this.canvasCtx.fillText(displayTime, this.canvas.width / 2, this.canvas.height - this.visulOption.textSize)

    //display lrc
    let currentTime = this.audio.currentTime
    this.canvasCtx.font = this.visulOption.textSize + "px Arial"


    for (let i = 0 ;i < this.lrcTimeArray.length; i++) {

      if (this.lrcTimeArray[i] >= currentTime) {
        if (i >= 2) {
          this.canvasCtx.fillText(
            this.lrcStrArray[i - 2],
            this.canvas.width / 2,
            this.canvas.height / 2 - this.visulOption.textSize / 2
            + (-2) * (this.visulOption.textSize + this.visulOption.textBetween))
        }
        if (i >= 1) {
          this.canvasCtx.fillText(
            this.lrcStrArray[i - 1],
            this.canvas.width / 2,
            this.canvas.height / 2 - this.visulOption.textSize / 2
            + (-1) * (this.visulOption.textSize + this.visulOption.textBetween))
        }

        //high light
        this.canvasCtx.fillStyle = this.visulOption.color
        this.canvasCtx.fillText(
          this.lrcStrArray[i],
          this.canvas.width / 2,
          this.canvas.height / 2 - this.visulOption.textSize / 2)
        //normal color
        this.canvasCtx.fillStyle = this.visulOption.textColor

        if (i <= this.lrcStrArray.length - 1) {
          this.canvasCtx.fillText(
            this.lrcStrArray[i + 1],
            this.canvas.width / 2,
            this.canvas.height / 2 - this.visulOption.textSize / 2
            + (1) * (this.visulOption.textSize + this.visulOption.textBetween))
        }
        if (i <= this.lrcStrArray.length - 2) {
          this.canvasCtx.fillText(
            this.lrcStrArray[i + 2],
            this.canvas.width / 2,
            this.canvas.height / 2 - this.visulOption.textSize / 2
            + (2) * (this.visulOption.textSize + this.visulOption.textBetween))
        }
        break
      }
    }

  }
}


