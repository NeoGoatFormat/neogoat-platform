(function(root, factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.NeoGoatYDKE=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  var ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  function decodeValue(character){
    var index=ALPHABET.indexOf(character);
    return index>=0?index:-1;
  }

  function decodeBase64(encoded){
    encoded=String(encoded||"");
    if(!encoded)return [];
    if(encoded.length%4!==0)throw new Error("Invalid Base64 length");
    var bytes=[];
    for(var offset=0;offset<encoded.length;offset+=4){
      var last=offset+4===encoded.length;
      var pad2=encoded[offset+2]==="=";
      var pad3=encoded[offset+3]==="=";
      var a=decodeValue(encoded[offset]);
      var b=decodeValue(encoded[offset+1]);
      var c=pad2?0:decodeValue(encoded[offset+2]);
      var d=pad3?0:decodeValue(encoded[offset+3]);
      if(a<0||b<0||c<0||d<0||(pad2&&!pad3)||((pad2||pad3)&&!last))throw new Error("Invalid Base64 data");
      if(pad2&&(b&15)!==0)throw new Error("Invalid Base64 padding");
      if(pad3&&!pad2&&(c&3)!==0)throw new Error("Invalid Base64 padding");
      var value=(a<<18)|(b<<12)|(c<<6)|d;
      bytes.push((value>>>16)&255);
      if(!pad2)bytes.push((value>>>8)&255);
      if(!pad3)bytes.push(value&255);
    }
    return bytes;
  }

  function encodeBase64(bytes){
    var result="";
    for(var offset=0;offset<bytes.length;offset+=3){
      var remaining=bytes.length-offset;
      var value=(bytes[offset]<<16)|(remaining>1?bytes[offset+1]<<8:0)|(remaining>2?bytes[offset+2]:0);
      result+=ALPHABET[(value>>>18)&63];
      result+=ALPHABET[(value>>>12)&63];
      result+=remaining>1?ALPHABET[(value>>>6)&63]:"=";
      result+=remaining>2?ALPHABET[value&63]:"=";
    }
    return result;
  }

  function decodeCardIds(encoded){
    var bytes=decodeBase64(encoded);
    if(bytes.length%4!==0)throw new Error("Invalid YDKE card data");
    var cards=[];
    for(var offset=0;offset<bytes.length;offset+=4){
      cards.push((bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0);
    }
    return cards;
  }

  function encodeCardIds(cards){
    var bytes=[];
    (cards||[]).forEach(function(card){
      var code=Number(card)>>>0;
      bytes.push(code&255,(code>>>8)&255,(code>>>16)&255,(code>>>24)&255);
    });
    return encodeBase64(bytes);
  }

  function parse(input){
    var text=String(input||"").trim();
    if(text.slice(0,7)!=="ydke://")throw new Error("Missing ydke:// prefix");
    var sections=text.slice(7).split("!");
    if(sections.length!==4||sections[3]!=="")throw new Error("Incomplete YDKE code");
    return {
      main:decodeCardIds(sections[0]),
      extra:decodeCardIds(sections[1]),
      side:decodeCardIds(sections[2])
    };
  }

  function stringify(deck){
    deck=deck||{};
    return "ydke://"+encodeCardIds(deck.main)+"!"+encodeCardIds(deck.extra)+"!"+encodeCardIds(deck.side)+"!";
  }

  return {parse:parse,stringify:stringify};
});
