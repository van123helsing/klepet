function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeVideo = sporocilo.indexOf('https://www.youtube.com') > -1;
  var jeSlikca = sporocilo.indexOf('class="slikce"') > -1;
  if (jeSmesko || jeSlikca || jeVideo) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/&lt;img src='http:\/\/sandbox.lavbic.net/g, '<img src=\'http://sandbox.lavbic.net').replace(/png\' \/&gt;/g, 'png\' />');
    sporocilo = sporocilo.replace(/&lt;br&gt;&lt;img class="slikce"/g, '<br><img class="slikce"').replace(/png" \/&gt;/g, 'png" />').replace(/jpg" \/&gt;/g, 'jpg" />').replace(/gif" \/&gt;/g, 'gif" />');
    sporocilo = sporocilo.replace(/&lt;br&gt;&lt;iframe class="youtube-video/g, '<br><iframe class="video').replace(/allowfullscreen&gt;&lt;\/iframe&gt;/g, 'allowfullscreen></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = dodajVideo(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

function dodajSlike (vhodnoBesedilo) {
  var vseSlikce = vhodnoBesedilo.match(/(http:\/\/|https:\/\/)\S+(\.jpg|\.png|\.gif)/gi);
  for( var slikca in vseSlikce)
    vhodnoBesedilo += (' <br><img class="slikce" src="' + vseSlikce[slikca] + '" />');
  return vhodnoBesedilo;
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

function dodajVideo(vhodnoBesedilo) {
  var videi = vhodnoBesedilo.match(/https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9\-_]{11}/g);
  for(var video in videi) {
    var tokens = videi[video].split(/v=/);
    vhodnoBesedilo = vhodnoBesedilo + (' <br><iframe class="youtube-video" src="https://www.youtube.com/embed/' + tokens[1] + '" allowfullscreen></iframe>');
  }
  return vhodnoBesedilo;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno "'+$(this).text()+'"');
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('dregljaj', function(){
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    setTimeout(function(){
      $('#vsebina').trigger('stopRumble');
    },1500);
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
