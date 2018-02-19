<?php
	header('Content-Type:text/html;charset=utf-8');
	$dir='./medias/';
	$res=array();
	if(is_dir($dir)){
		if($handle=opendir($dir)){
			while(($file=readdir($handle))!==false){
				if($file!='.'&&$file!='..'&&pathinfo($file)['extension']=="mp3"){
					array_push($res,$file);
				}
			}
		}
	}else{
		echo 'open dir error';
	}
	echo json_encode(array("res" => $res));
?>