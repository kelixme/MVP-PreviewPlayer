(function () {
  "use strict";

  var SRC = "mvpsounds.json";
  var AUDIO_DIR = "audios";

  var list = document.getElementById("list");
  var search = document.getElementById("search");
  var countLabel = document.getElementById("countLabel");

  var trackTitle = document.getElementById("trackTitle");
  var trackSub = document.getElementById("trackSub");
  var artIcon = document.getElementById("artIcon");
  var playerArt = document.getElementById("playerArt");

  var btnPlay = document.getElementById("btnPlay");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");

  var timeCur = document.getElementById("timeCur");
  var timeDur = document.getElementById("timeDur");
  var bar = document.getElementById("bar");
  var fill = document.getElementById("fill");
  var thumb = document.getElementById("thumb");

  var audio = new Audio();
  audio.preload = "none";
  audio.volume = 1;

  var tracks = [];        // [{id, title, mp3}]
  var current = -1;       // index into tracks
  var playing = false;

  var filterText = "";
  var renderedRows = [];  // {key, el}

  var src = SRC;

  // ---------- Load data ----------
  fetch(SRC)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      tracks = normalizeData(data);
      colorTable = buildColorTable();   // сгенерировать случайные цвета для всех треков
      if (tracks.length) selectTrack(0);   // первый трек выбран, но не играет
      else updatePlayerUI(null);
      render();                 // список сразу
      preloadDates();           // даты подставляются по мере загрузки
    })
    .catch(function (err) {
      list.innerHTML = '<div class="list-empty">Не удалось загрузить ' + src + ': ' + err.message + "</div>";
    });

  // Читаем дату изменения из mvpsounds-meta.json (сформирован из реальных дат файлов в audios/).
  // Это надёжный способ для статического хостинга (github.io), где нет серверного кода.
  var META = "mvpsounds-meta.json";
  function preloadDates() {
    fetch(META, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (meta) {
        if (!meta) return;
        tracks.forEach(function (t) {
          if (t.num !== null) {
            var m = meta[t.num];
            if (m && m.modified) {
              t.modified = m.modified;
              refreshRowDate(t.id);
            }
          }
        });
      })
      .catch(function () { /* файла метаданных нет — даты не критичны */ });
  }

  function refreshRowDate(id) {
    var track = tracks[id];
    if (!track) return;
    var row = document.querySelector('.track[data-index="' + id + '"] .track__date');
    if (row) row.textContent = track.modified ? formatDate(track.modified) : "…";
  }

  // Платформы для поиска трека — иконки, открывающие ссылку в новой вкладке.
  // Логика кодирования запроса: YouTube — пробелы->'+', остальные — encodeURIComponent (как в old.html)
  var PLATFORMS = [
    { id: "vk", icon: "icon/muz-vk.png", name: "VK Музыка", make: function (q) { return "https://vk.com/audios?q=" + encodeURIComponent(q); } },
    { id: "yt", icon: "icon/muz-yt.png", name: "YouTube", make: function (q) { return "https://youtube.com/search?q=" + q.replace(/ /g, "+"); } },
    { id: "ya", icon: "icon/muz-ya.png", name: "Яндекс Музыка", make: function (q) { return "https://music.yandex.ru/search?text=" + encodeURIComponent(q); } },
    { id: "sp", icon: "icon/muz-spo.png", name: "Spotify", make: function (q) { return "https://open.spotify.com/search/" + encodeURIComponent(q); } }
  ];

  var playerPlatforms = document.getElementById("playerPlatforms");

  function buildPlatforms(title, cls) {
    var wrap = document.createElement("div");
    wrap.className = cls;
    PLATFORMS.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "platforms__link";
      a.href = p.make(title);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = "Искать: " + p.name;
      var img = document.createElement("img");
      img.src = p.icon;
      img.alt = p.name;
      img.loading = "lazy";
      a.appendChild(img);
      wrap.appendChild(a);
    });
    return wrap;
  }

  function updatePlayerPlatforms(title) {
    playerPlatforms.innerHTML = "";
    if (!title) return;
    // строим ссылки прямо внутри контейнера .platforms (без вложенного div)
    PLATFORMS.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "platforms__link";
      a.href = p.make(title);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = "Искать: " + p.name;
      var img = document.createElement("img");
      img.src = p.icon;
      img.alt = p.name;
      img.loading = "lazy";
      a.appendChild(img);
      playerPlatforms.appendChild(a);
    });
  }

  function normalizeData(data) {
    var out = [];
    var dir = data && data.dir ? String(data.dir).replace(/[\\/]+$/g, "") : "";
    var arr = Array.isArray(data) ? data : (data && data.sounds);
    if (!Array.isArray(arr)) arr = [];

    arr.forEach(function (entry, i) {
      var key = "", title = "";
      if (Array.isArray(entry)) {
        key = String(entry[0] || "");
        title = String(entry[1] || "");
      } else if (entry && typeof entry === "object") {
        key = String(entry.file || entry.src || entry.key || "");
        title = String(entry.title || entry.name || "");
      }
      if (!title && key) title = key;

      // Имя файла: берём число из "N.vsnd_c" и строим путь N.mp3
      var num = String(key).match(/(\d+)/);
      var mp3 = "";
      var tnum = null;
      if (num) {
        tnum = parseInt(num[1], 10);
        mp3 = tnum + ".mp3";
      } else {
        mp3 = (dir ? dir + "/" : "") + key;
        if (!/\.(mp3|wav|ogg|m4a)$/i.test(mp3)) mp3 += ".mp3";
      }

      out.push({ id: i, num: tnum, title: title, mp3: mp3, modified: null });
    });

    return out;
  }

  // ---------- Rendering ----------
  function render() {
    list.innerHTML = "";
    renderedRows = [];

    countLabel.textContent = tracks.length + " треков";

    var q = filterText.toLowerCase().trim();
    var visible = 0;

    tracks.forEach(function (track, i) {
      var match = !q || track.title.toLowerCase().indexOf(q) !== -1;
      var el = buildRow(track, i);
      if (match) {
        visible++;
        list.appendChild(el);
        renderedRows.push({ key: i, el: el });
      }
    });

    // ставим задержку для каскадного появления
    renderedRows.forEach(function (row, i) {
      (function (r) {
        setTimeout(function () {
          r.el.classList.add("show");
          syncRow(r.key, r.el);
        }, Math.min(i * 14, 600));
      })(row);
    });

    if (!visible) {
      list.appendChild(makeEmpty("Ничего не найдено"));
    }
  }

  function buildRow(track, index) {
    var el = document.createElement("div");
    el.className = "track";
    el.dataset.index = index;

    var barHT = document.createElement("div");
    barHT.className = "track__bar";
    barHT.innerHTML = "<span></span><span></span><span></span>";

    var num = document.createElement("div");
    num.className = "track__num";
    num.textContent = index + 1;

    var title = document.createElement("div");
    title.className = "track__title";
    title.textContent = track.title;

    var date = document.createElement("div");
    date.className = "track__date";
    date.textContent = track.modified ? formatDate(track.modified) : "…";
    date.dataset.loaded = track.modified ? "1" : "0";

    var platforms = buildPlatforms(track.title, "track__platforms");

    el.appendChild(barHT);
    el.appendChild(num);
    el.appendChild(title);
    el.appendChild(platforms);
    el.appendChild(date);

    // клик по иконке не должен запускать трек
    platforms.addEventListener("click", function (e) { e.stopPropagation(); });

    el.addEventListener("click", function () {
      toggleFromRow(index);
    });

    return el;
  }

  function syncRow(index, el) {
    if (!el) return;
    var isActive = index === current;
    el.classList.toggle("active", isActive);
    // эквалайзер анимируется только когда трек играет
    el.classList.toggle("playing", isActive && playing);
  }

  // ---------- Playback ----------
  function loadTrack(index) {
    selectTrack(index);
    tryPlay();
  }

  // Выбирает трек (название, обложка, список) без запуска воспроизведения
  function selectTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    current = index;
    var t = tracks[index];
    audio.src = AUDIO_DIR + "/" + t.mp3;
    // Единый источник правды: ЧТЕНИЕ из json, а не хардкод в JS.
    trackTitle.textContent = t.title;
    trackSub.textContent = t.mp3;
    updatePlayerUI(index);
    syncAllRows();
    // задержка смены цвета на кадр, чтобы не конфликтовать с загрузкой аудио (плавнее)
    requestAnimationFrame(function () { setAccent(index); });
  }

  function tryPlay() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () { playing = false; updatePlayerUI(current); syncAllRows(); });
  }

  function toggleCurrent() {
    if (current === -1) {
      if (tracks.length) loadTrack(0);
      return;
    }
    if (audio.paused) {
      tryPlay();
    } else {
      audio.pause();
    }
  }

  function toggleFromRow(index) {
    if (index === current) {
      toggleCurrent();
      return;
    }
    if (current !== -1) {
      audio.pause();
      audio.currentTime = 0;
    }
    loadTrack(index);
  }

  function playAdjacent(dir) {
    if (!tracks.length) return;
    var prev = current;
    var idx = current === -1 ? 0 : (current + dir + tracks.length) % tracks.length;
    // пересечение границы: с последнего на первый или с первого на последний
    var crossed = prev !== -1 && (
      (dir === 1 && prev === tracks.length - 1 && idx === 0) ||
      (dir === -1 && prev === 0 && idx === tracks.length - 1)
    );
    audio.pause();
    audio.currentTime = 0;
    loadTrack(idx);
    if (crossed) scrollToRow(idx);
  }

  // ---------- Audio events ----------
audio.addEventListener("play", function () {
    playing = true;
    playerArt.classList.add("playing");
    setIcon(artIcon, "pause");
    setBtnIcon("pause");
    updatePlayerUI(current);
    syncAllRows();
    startRaf();
  });

  audio.addEventListener("pause", function () {
    playing = false;
    playerArt.classList.remove("playing");
    setIcon(artIcon, "play");
    setBtnIcon("play");
    updatePlayerUI(current);
    syncAllRows();
    stopRaf();
  });

  audio.addEventListener("pause", function () {
    playing = false;
    playerArt.classList.remove("playing");
    setIcon(artIcon, "play");
    setBtnIcon("play");
    updatePlayerUI(current);
    syncAllRows();
  });

  audio.addEventListener("ended", function () {
    if (tracks.length) playAdjacent(1);
    else updatePlayerUI(current);
  });

  // Плавный прогресс: единый rAF-цикл, обновляющий ширину каждый кадр (60fps).
  // Пишем width/left напрямую (не через CSS-переменную) — быстрее и без задержки применения.
  var rafId = null;
  function setProgress(pct) {
    pct = Math.max(0, Math.min(100, pct));
    fill.style.width = pct + "%";
    thumb.style.left = pct + "%";
  }
  function tickProgress() {
    var d = audio.duration || 0;
    var c = audio.currentTime || 0;
    var pct = d ? (c / d) * 100 : 0;
    setProgress(pct);
    timeCur.textContent = fmt(c);
    rafId = requestAnimationFrame(tickProgress);
  }
  function startRaf() {
    stopRaf();
    tickProgress();
  }
  function stopRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // timeupdate — только лёгкое обновление длительности (толкаем пересчёт)
  audio.addEventListener("timeupdate", function () {
    var d = audio.duration || 0;
    if (d) timeDur.textContent = fmt(d);
  });

  audio.addEventListener("loadedmetadata", function () {
    timeDur.textContent = fmt(audio.duration || 0);
  });

  audio.addEventListener("error", function () {
    updatePlayerUI(current);
  });

  // ---------- Controls ----------
  btnPlay.addEventListener("click", toggleCurrent);
  btnPrev.addEventListener("click", function () { playAdjacent(-1); });
  btnNext.addEventListener("click", function () { playAdjacent(1); });

  // клик по обложке тоже переключает воспроизведение (пауза/старт)
  playerArt.addEventListener("click", function (e) {
    toggleCurrent();
  });

  // Seek
  bar.addEventListener("click", function (e) {
    seekFromEvent(e);
  });

  var dragging = false;
  bar.addEventListener("mousedown", function (e) {
    dragging = true;
    bar.classList.add("dragging");
    stopRaf();
    seekFromEvent(e);
  });
  document.addEventListener("mousemove", function (e) {
    if (dragging) seekFromEvent(e);
  });
  document.addEventListener("mouseup", function () {
    if (dragging) {
      dragging = false;
      bar.classList.remove("dragging");
      if (playing) startRaf();
    }
  });
  bar.addEventListener("touchstart", function (e) {
    dragging = true;
    bar.classList.add("dragging");
    stopRaf();
  }, { passive: true });
  bar.addEventListener("touchmove", function (e) {
    if (dragging) seekFromEvent(e.touches[0]);
  }, { passive: true });
  bar.addEventListener("touchend", function () {
    dragging = false;
    bar.classList.remove("dragging");
    if (playing) startRaf();
  });

  function seekFromEvent(ev) {
    var rect = bar.getBoundingClientRect();
    var x = (ev.clientX || ev.pageX) - rect.left;
    var ratio = Math.max(0, Math.min(1, x / rect.width));
    if (!isFinite(ratio)) return;
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration;
    }
    setProgress(ratio * 100);
  }

  // ---------- Search (триггерный: реагирует на каждый ввод) ----------
  search.addEventListener("input", function () {
    filterText = this.value;
    applySearch();
  });
  search.addEventListener("search", function () {
    filterText = this.value;
    applySearch();
  });

  function applySearch() {
    var q = filterText.toLowerCase().trim();
    var visible = 0;
    var queryWords = q ? normalize(q).split(/\s+/).filter(Boolean) : [];

    renderedRows.forEach(function (row) {
      var t = tracks[row.key];
      var title = t.title;
      var normTitle = normalize(title);
      var match = !q || fuzzyMatch(normTitle, queryWords);
      row.el.style.display = match ? "" : "none";
      if (match) {
        visible++;
        // подсветка совпадения в названии (по точной подстроке, если она есть)
        var titleEl = row.el.querySelector(".track__title");
        if (titleEl) {
          if (q && title.toLowerCase().indexOf(q) !== -1) {
            var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
            titleEl.innerHTML = title.replace(re, '<mark class="hl">$1</mark>');
          } else {
            titleEl.textContent = title;
          }
        }
      }
    });

    // удаляем старый пустой placeholder
    var existing = list.querySelector(".list-empty");
    if (existing) existing.remove();
    if (!visible) {
      list.appendChild(makeEmpty("Ничего не найдено"));
    }

    // обновляем счётчик
    countLabel.textContent = q ? visible + " из " + tracks.length + " треков" : tracks.length + " треков";
  }

  // нечёткое совпадение: каждое слово запроса должно присутствовать в названии
  // как подстрока либо как близкое по написанию слово (устойчивость к опечаткам)
  function fuzzyMatch(normTitle, queryWords) {
    for (var i = 0; i < queryWords.length; i++) {
      var w = queryWords[i];
      if (w.length < 3) {
        // короткие слова — только точная подстрока
        if (normTitle.indexOf(w) === -1) return false;
        continue;
      }
      if (normTitle.indexOf(w) !== -1) continue;   // точная подстрока — ок
      // иначе проверяем каждое слово названия на близость к запросу
      var words = normTitle.split(/\s+/);
      var found = false;
      for (var j = 0; j < words.length; j++) {
        if (closeEnough(words[j], w)) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }

  // допустимое расстояние (Левенштейн) для опечаток — максимум 1 правка
  function closeEnough(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a === b) return true;
    // минимум одна замена/вставка/удаление — distance <= 1
    var i, j;
    var prev = [];
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] > 1 && j === b.length && i === a.length) { /* выходим рано */ }
      }
      prev = cur;
    }
    return prev[b.length] <= 1;
  }

  // транслитерация для сравнения русских и латинских эквивалентов
  function normalize(str) {
    var map = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
      и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
      с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
      ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
    };
    return str.toLowerCase()
      .replace(/[ъь]/g, "")
      .replace(/[а-яё]/g, function (c) { return map[c] || c; });
  }

  function makeEmpty(text) {
    var d = document.createElement("div");
    d.className = "list-empty";
    d.textContent = text;
    return d;
  }

// ---------- Accent / theme ----------
  // Уникальный цвет для каждого трека. Порядок случайный (перемешан), но первый трек
  // всегда имеет один и тот же стартовый цвет.
  var GOLDEN = 0.6180339887;
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) {
      var kk = k(n);
      return l - a * Math.max(-1, Math.min(kk - 3, 9 - kk, 1));
    };
    return rgbBytes(f(0), f(8), f(4));
  }
  function rgbBytes(r, g, b) {
    var to2 = function (x) {
      var v = Math.round(x * 255);
      return v.toString(16).padStart(2, "0");
    };
    return "#" + to2(r) + to2(g) + to2(b);
  }

  var currentColors = null;   // {accent, accent2, artA, artB, glowA, glowB, thumb}
  var animRaf = null;         // id кадра анимации цвета
  var colorTable = [];        // таблица уникальных цветов (строится после загрузки треков)

  // генерирует случайную таблицу уникальных цветов для всех треков
  function buildColorTable() {
    var n = tracks.length;
    var table = [];
    for (var i = 0; i < n; i++) {
      var h = Math.round((((i + 1) * GOLDEN) % 1) * 360);
      table.push(hslToHex(h, 85, 70));   // яркие насыщенные цвета, без тёмных тонов
    }
    // перемешиваем цвета (кроме первого), чтобы порядок был случайным
    for (var j = 1; j < n; j++) {
      var r = j + Math.floor(Math.random() * (n - j));
      var tmp = table[j]; table[j] = table[r]; table[r] = tmp;
    }
    // первый трек всегда красный
    table[0] = "#e23b3b";
    return table;
  }

  // вычисляет hue (0-360) из hex-цвета
  function hexToHue(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    if (d === 0) return 0;
    var hue;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    return hue;
  }

  // цвет для трека с данным индексом (берётся из перемешанной таблицы)
  function colorsFor(index) {
    var idx = index % colorTable.length;
    var a = colorTable[idx];
    var h = hexToHue(a);
    // второй цвет — тот же оттенок (hue), но другой тон: чуть светлее и мягче
    var b = hslToHex(h, 85, 72);
    return {
      accent: hexToRgb(a),
      accent2: hexToRgb(b),
      artA: hexToRgb(a),
      artB: hexToRgb(b),
      glowA: hexToRgb(a),
      glowB: hexToRgb(b),
      thumb: hexToRgb(lighten(a))
    };
  }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbStr(c) {
    return "rgb(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + ")";
  }
  // линейная интерполяция двух цветов
  function mix(c1, c2, t) {
    return {
      r: c1.r + (c2.r - c1.r) * t,
      g: c1.g + (c2.g - c1.g) * t,
      b: c1.b + (c2.b - c1.b) * t
    };
  }
  // интерполирует два набора ссылочных цветов
  function mixColors(a, b, t) {
    return {
      accent: mix(a.accent, b.accent, t),
      accent2: mix(a.accent2, b.accent2, t),
      artA: mix(a.artA, b.artA, t),
      artB: mix(a.artB, b.artB, t),
      glowA: mix(a.glowA, b.glowA, t),
      glowB: mix(a.glowB, b.glowB, t),
      thumb: mix(a.thumb, b.thumb, t)
    };
  }

  function setAccent(index) {
    var to = colorsFor(index);
    if (!currentColors) {
      applyColors(to);
      currentColors = to;
      return;
    }
    // прямой плавный переход от текущего цвета к целевому, без промежуточных палитр
    var from = currentColors;
    var start = null;
    var DUR = 500;                              // мс
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / DUR);
      var e = easeOut(t);
      applyColors(mixColors(from, to, e));
      if (t < 1) {
        animRaf = requestAnimationFrame(frame);
      } else {
        currentColors = to;
        animRaf = null;
      }
    }
    if (animRaf) cancelAnimationFrame(animRaf);
    animRaf = requestAnimationFrame(frame);
  }

  function applyColors(c) {
    var r = document.querySelector(":root");
    r.style.setProperty("--accent", rgbStr(c.accent));
    r.style.setProperty("--accent2", rgbStr(c.accent2));
    r.style.setProperty("--art-a", rgbStr(c.artA));
    r.style.setProperty("--art-b", rgbStr(c.artB));
    r.style.setProperty("--glow-a", rgbStr(c.glowA));
    r.style.setProperty("--glow-b", rgbStr(c.glowB));
    r.style.setProperty("--thumb-color", rgbStr(c.thumb));
  }

// приглушает/осветляет цвет для ползунка (гекс -> более светлый оттенок, возвращает hex)
  function lighten(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.round(v + (255 - v) * 0.55); };
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  function setIcon(img, name) {
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(SVG_ICONS[name] || "");
  }

  function setBtnIcon(name) {
    var use = btnPlay.querySelector("use");
    if (use) use.setAttribute("href", "#icon-" + name);
  }

  var SVG_ICONS = {
    play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
  };

  function updatePlayerUI(index) {
    var t = index >= 0 ? tracks[index] : null;
    if (!t) {
      trackTitle.textContent = "Выберите трек";
      trackSub.textContent = "None";
      updatePlayerPlatforms("");
      setIcon(artIcon, "play");
      setBtnIcon("play");
      timeCur.textContent = "0:00";
      timeDur.textContent = "0:00";
      return;
    }
    trackTitle.textContent = t.title;
    trackSub.textContent = t.mp3;
    updatePlayerPlatforms(t.title);
    setIcon(artIcon, playing ? "pause" : "play");
    setBtnIcon(playing ? "pause" : "play");
  }

  function syncAllRows() {
    renderedRows.forEach(function (r) {
      syncRow(r.key, r.el);
    });
    // автоскролл к активной строке — ТОЛЬКО при пересечении границы списка (см. scrollToRow)
  }

  function scrollToRow(index) {
    if (index < 0) return;
    var active = renderedRows.find(function (r) { return r.key === index; });
    if (!active || !active.el.scrollIntoView) return;
    var wrap = active.el.closest(".list") || list;
    var wrect = wrap.getBoundingClientRect();
    var arect = active.el.getBoundingClientRect();
    if (arect.top < wrect.top || arect.bottom > wrect.bottom) {
      wrap.scrollTo({ top: wrap.scrollTop + (arect.top - wrect.top) - wrect.height / 2 + arect.height / 2, behavior: "smooth" });
    }
  }

  // форматирует дату в "ДД.ММ.ГГГГ" (принимает ISO или HTTP Last-Modified)
  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yy = String(d.getFullYear() % 100).padStart(2, "0");
    return dd + "." + mm + "." + yy;
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  // keyboard space/arrows
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      toggleCurrent();
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      playAdjacent(-1);
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      playAdjacent(1);
    }
  });
})();