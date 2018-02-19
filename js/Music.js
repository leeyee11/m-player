const getNode=(key,value)=>{
    if(key=="class"){
        return document.getElementsByClassName(value);
    }else if(key=="id"){
        return document.getElementById(value);
    } 
}
const getWidth=(node)=>{
    return parseFloat(getComputedStyle(node,false).width);
}
const getHeight=(node)=>{
    return parseFloat(getComputedStyle(node,false).height);
}

class Music{
	constructor(){
		//init context
		try{
			this.context=new AudioContext();
		}catch(e){
			throw new Error("please use chrome instead");
		}
		//init audio
		this.processor=this.context.createScriptProcessor(1024);
		this.analyser=this.context.createAnalyser();
		this.audio=new Audio();
		this.index=0;
		this.lrcTimeArray=[];
		this.lrcStrArray=[];

		this.audioOption={
			defaultVolume:0.2
		}

		//init canvas
		this.initAudio()
		this.initWidgt();

		this.visulOption={
			type:'circle',
			color:'rgb(255,200,200)',
			shadowColor:'rgb(255,220,220)',
			shadowSize:0,
			lineWidth:7,
			spaceBetween:1,
			speed:5,
			textSize:16,
			textBetween:8,
			textColor:'rgb(255,255,255)',
			textShadow:2
		}
	}
	initWidgt(){
		//init nodes
		this.musicPlayer=getNode("class","music-player")[0]
		this.listPanel=getNode('class','list-panel')[0];
		this.toolPanel=getNode('class',"tool-panel")[0];
		this.canvas=getNode('id','canvas');
		this.canvasCtx=canvas.getContext('2d');
		this.slider=getNode('id','slider');
		this.volume=getNode('id','volume');
		this.prevBtn=getNode('id','prev-btn');
		this.playBtn=getNode('id','play-btn');
		this.nextBtn=getNode('id','next-btn')

		//init medias
		this.updateMediaList();

		//init widget
		this.slider.value=0;
		this.volume.value=this.audioOption.defaultVolume;
		this.audio.volume=this.volume.value;
		this.volume.oninput=()=>{
			this.audio.volume=this.volume.value;
		}	
		this.slider.oninput=()=>{
			this.audio.currentTime=this.slider.value;
		}
		this.playBtn.onclick=()=>{
			if(this.audio.src==''){
				this.loadAudio();
				this.loadLRC();
			}else if(this.audio.paused){
				this.audio.play();
				this.playBtn.style.backgroundImage="url('./img/pause.png')";
			}else if(!this.audio.paused){
				this.audio.pause();
				this.playBtn.style.backgroundImage="url('./img/play.png')";
			}
		}
		this.prevBtn.onclick=()=>{
			getNode("class","selected")[0].classList.remove("selected");
			if(this.index>0){
				this.index--;
			}else{
				this.index=this.medias.length-1;
			}
			getNode("class","media-item")[this.index].classList.add("selected")
			this.loadAudio()
			this.loadLRC();
		}
		this.nextBtn.onclick=()=>{
			getNode("class","selected")[0].classList.remove("selected");

			if(this.index<this.medias.length-1){
				this.index++;
			}else{
				this.index=0;
			}
			getNode("class","media-item")[this.index].classList.add("selected")
			this.loadLRC();
			this.loadAudio()
		}
		this.resizeWidget();

		//onresize
		window.onresize=()=>{this.resizeWidget()};
	}
	resizeWidget(){
		//canvas
		this.canvas.width=getWidth(this.musicPlayer)-getWidth(this.listPanel);
		this.canvas.height=getHeight(this.musicPlayer)-getHeight(this.toolPanel);
	}
	initAudio(){
		this.processor=this.context.createScriptProcessor(1024);
		this.analyser=this.context.createAnalyser();
		this.audio=new Audio();
		this.index=0;
		this.lrcTimeArray=[];
		this.lrcStrArray=[];

		//create media element
		this.music=this.context.createMediaElementSource(this.audio);

		//processor connect
		this.processor.connect(this.context.destination);
		//analyser connect to processor
		this.analyser.connect(this.processor);
		//define a byte stream to analyse the data

		//music connect
		this.music.connect(this.analyser);
		this.music.connect(this.context.destination);

		this.audioOption={
			defaultVolume:0.3
		}
	}
	loadAudio(){
		this.audio.src="./medias/"+this.medias[this.index];
		this.audio.oncanplay=()=>{
			//set slider
			this.slider.max=this.audio.duration;
			this.slider.value=0;
			this.audio.play();
			this.playBtn.style.backgroundImage="url('./img/pause.png')";
			this.visulizeAudio();
		};
		//on ended
		this.audio.onended=()=>{
			// this.music.disconnect();
			// this.music=null;
			// this.processor.onaudioprocess=()=>{};

			//play next sound

			if(this.index<this.medias.length-1){
				this.index++;
			}else{
				this.index=0;
			}

			this.loadAudio()
			this.loadLRC();
		}
	}
	visulizeAudio() {
		requestAnimationFrame(()=>{
			this.visulizeAudio();
    	});

    	//update slider
    	this.slider.value=this.audio.currentTime;

		//update canvas

    	//a buffer to get data
		this.data=new Uint8Array(this.analyser.frequencyBinCount);
		//store data to buffer
    	this.analyser.getByteTimeDomainData(this.data);
		//clear canvas
    	this.canvasCtx.clearRect(0,0,this.canvas.width,this.canvas.height);
    	switch(this.visulOption.type){
    		case 'bar':
    			this.visulizeBar();break;
    		case 'circle':
    			this.visulizeCircle();break;

    	}
    	this.displayLRC();
    }
    loadLRC(){
    	this.lrcTimeArray.length=0;
    	this.lrcStrArray.length=0;
    	this.xhr=new XMLHttpRequest();
    	this.xhr.onreadystatechange=()=>{
			if(this.xhr.readyState==4&&this.xhr.status==200){
				const lrcRaw=eval('"'+this.xhr.responseText+'"');
				const lrcArray=lrcRaw.split("\r\n");
				// console.log(lrcArray);
				// const lrcArray=[];
				for(let i=0;i<lrcArray.length;i++){
					let line=lrcArray[i].replace("[","");
					let lrcTimeStr=line.split("]")[0];
					let lrcStr=line.split("]")[1];
					let lrcTime=parseFloat(lrcTimeStr.split(":")[0])*60+parseFloat(lrcTimeStr.split(":")[1]);
					if(lrcStr==''){
						lrcStr='...';
					}
					this.lrcTimeArray.push(lrcTime);
					this.lrcStrArray.push(lrcStr);
				}
			}else if(this.xhr.readyState==4&&this.xhr.status!=200){
				console.log(this.xhr.responseText);
			}
		}
		console.log(this.medias[this.index].replace(".mp3",".lrc"));
		this.xhr.open("GET","./medias/"+this.medias[this.index].replace(".mp3",".lrc"),true);
		try{
			this.xhr.send();
		}catch(e){
			throw e;
		}
    }
    updateMediaList(){
    	this.xhr=new XMLHttpRequest();
    	this.xhr.onreadystatechange=()=>{
    		//success
			if(this.xhr.readyState==4&&this.xhr.status==200){
				console.log(this.xhr.responseText);
				let data=JSON.parse(this.xhr.responseText);
				this.medias=data.res;
    			console.log(this.medias)
    			this.listPanel=getNode("class","list-panel")[0];
    			this.listPanel.innerHTML=""
				for(let i=0;i<this.medias.length;i++){
					let node=document.createElement('div');
					node.innerHTML=this.medias[i].split(".")[0];
					node.classList.add("media-item");
					if(i==0){
						node.classList.add("selected")
					};
					node.onclick=()=>{
						getNode("class","selected")[0].classList.remove("selected");
						node.classList.add("selected");
						//load audio
						this.index=i;
						this.loadAudio();
						this.loadLRC();
					}
					this.listPanel.appendChild(node);
				}
			}else if(this.xhr.readyState==4&&this.xhr.status!=200){
				console.log(JSON.parse(this.xhr.responseText));
			}
		}
		this.xhr.open("GET","getMediaList.php",true);
		this.xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		this.xhr.send();

    }
    
    visulizeBar(){
    	let rectWidth=5;
    	let rectHeight=this.canvas.height/4;
    	this.canvasCtx.fillStyle=this.visulOption.color;
    	for(let i=0;
    		i<this.data.length;
    		i+=this.visulOption.spaceBetween
    			+this.visulOption.lineWidth
    	){
    		this.canvasCtx.fillRect(
    			rectWidth+i,
    			this.canvas.height/2,
    			rectWidth,
    			-rectHeight*(this.data[i]-128)/128
    		);
    	}
    }
    visulizeCircle(){
    	let radius=10;
    	let perAngle=Math.PI*2/360;
    	if(this.canvas.height>this.canvas.width){
    		radius=this.canvas.width/4;
    	}else{
    		radius=this.canvas.height/4;
    	}
    	this.canvasCtx.shadowOffsetX = 0;
        this.canvasCtx.shadowOffsetY = 0;
    	this.canvasCtx.shadowColor = this.visulOption.shadowColor;
        this.canvasCtx.shadowBlur = this.visulOption.shadowSize;
    	for(let i=0;
    		i<this.data.length;
    		i+=parseInt(this.data.length/360)*2
    	){
    		let lineLength=radius*((this.data[i]-128)/128)/this.volume.value+this.visulOption.lineWidth/2;
    		
    		this.canvasCtx.strokeStyle=this.visulOption.color;
    		this.canvasCtx.lineWidth=this.visulOption.lineWidth;
    		this.canvasCtx.beginPath();
    		this.canvasCtx.moveTo(
    			this.canvas.width/2,
    			this.canvas.height/2
    		);
    		this.canvasCtx.lineTo(
    			this.canvas.width/2+
    				Math.sin(perAngle*(i-this.visulOption.speed*this.audio.currentTime))*(radius+lineLength),
    			this.canvas.height/2+
    				Math.cos(perAngle*(i-this.visulOption.speed*this.audio.currentTime))*(radius+lineLength),
    		);
    		this.canvasCtx.closePath();
    		this.canvasCtx.stroke();
    	}
          	this.canvasCtx.shadowBlur = 0;
    	this.canvasCtx.lineWidth=0;

    	this.canvasCtx.globalCompositeOperation = 'destination-out'
    	this.canvasCtx.arc(
    		this.canvas.width/2,
    		this.canvas.height/2,
    		radius,
    		0,
    		Math.PI*2, true);
   		this.canvasCtx.fill();
    	this.canvasCtx.globalCompositeOperation = 'source-over'

    }
    displayLRC(){
    	const formatTime=(sec)=>{
			const res=Math.floor(sec/60)+':'+Math.floor(sec%60);
    		return res;
    	}
    	const displayTime=formatTime(this.audio.currentTime)+' / '+formatTime(this.audio.duration);
    	
    	this.canvasCtx.textAlign="center";
    	this.canvasCtx.fillStyle=this.visulOption.textColor;
        this.canvasCtx.shadowBlur = this.visulOption.textShadow;
    	this.canvasCtx.shadowColor = 'rgb(0,0,0)';

        //display time
    	this.canvasCtx.font=this.visulOption.textSize/5*4+"px Arial";
    	this.canvasCtx.fillText(displayTime,this.canvas.width/2,this.canvas.height-this.visulOption.textSize);

    	//display lrc
    	let currentTime=this.audio.currentTime;
    	this.canvasCtx.font=this.visulOption.textSize+"px Arial";


    	for(let i=0;i<this.lrcTimeArray.length;i++){

    		if(this.lrcTimeArray[i]>=currentTime){
    			if(i>=2){
    				this.canvasCtx.fillText(
    					this.lrcStrArray[i-2],
    					this.canvas.width/2,
    					this.canvas.height/2-this.visulOption.textSize/2
    						+(-2)*(this.visulOption.textSize+this.visulOption.textBetween));
    			}
    			if(i>=1){
    				this.canvasCtx.fillText(
    					this.lrcStrArray[i-1],
    					this.canvas.width/2,
    					this.canvas.height/2-this.visulOption.textSize/2
    						+(-1)*(this.visulOption.textSize+this.visulOption.textBetween));
    			}

    			//high light
    			this.canvasCtx.fillStyle=this.visulOption.color;
    			this.canvasCtx.fillText(
    					this.lrcStrArray[i],
    					this.canvas.width/2,
    					this.canvas.height/2-this.visulOption.textSize/2);
    			//normal color
    			this.canvasCtx.fillStyle=this.visulOption.textColor;

    			if(i<=this.lrcStrArray.length-1){
    				this.canvasCtx.fillText(
    					this.lrcStrArray[i+1],
    					this.canvas.width/2,
    					this.canvas.height/2-this.visulOption.textSize/2
    						+(1)*(this.visulOption.textSize+this.visulOption.textBetween));
    			}
    			if(i<=this.lrcStrArray.length-2){
    				this.canvasCtx.fillText(
    					this.lrcStrArray[i+2],
    					this.canvas.width/2,
    					this.canvas.height/2-this.visulOption.textSize/2
    						+(2)*(this.visulOption.textSize+this.visulOption.textBetween));
    			}
    			break;
    		}
    	}
 
    }
}


