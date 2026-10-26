const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const players = [];
for (const box of document.querySelectorAll('.player')) {
  const video = box.querySelector('video');
  const start = Number(box.dataset.start), end = Number(box.dataset.end), duration = end - start;
  const playButton = box.querySelector('.play'), scrub = box.querySelector('.scrub');
  const status = box.querySelector('.loading'), clock = box.querySelector('.time');
  const state = { box, video, start, end, visible: false, loaded: false, userPaused: false, ready: false };
  players.push(state);
  scrub.max = duration;
  const display = () => {
    const elapsed = Math.min(duration, Math.max(0, video.currentTime - start));
    scrub.value = elapsed;
    scrub.setAttribute('aria-valuetext', `${formatTime(elapsed)} of ${formatTime(duration)}`);
    clock.textContent = `${formatTime(elapsed)} / ${formatTime(Math.round(duration))}`;
  };
  const load = () => {
    if (state.loaded) return;
    state.loaded = true;
    video.src = `${box.dataset.source}#t=${start},${end}`;
    video.load();
  };
  const play = async () => {
    load();
    if (!state.ready) return;
    if (video.currentTime < start || video.currentTime >= end - 0.05) video.currentTime = start;
    try { await video.play(); } catch { /* The visible play button permits user-initiated playback. */ }
  };
  state.load = load;
  state.play = play;
  video.addEventListener('loadedmetadata', () => {
    if (video.duration < end - 0.05) {
      status.textContent = 'This video does not contain the selected segment.';
      return;
    }
    video.currentTime = start;
    state.ready = true;
    display();
    if (state.visible && !state.userPaused && !reducedMotion.matches) play();
  });
  video.addEventListener('loadeddata', () => { status.hidden = true; });
  video.addEventListener('waiting', () => { status.textContent = 'Loading demonstration…'; status.hidden = false; });
  video.addEventListener('playing', () => { status.hidden = true; });
  video.addEventListener('error', () => { status.hidden = false; status.textContent = 'Video could not be loaded. Reload the page to try again.'; });
  video.addEventListener('play', () => {
    box.classList.add('playing'); playButton.textContent = 'Ⅱ'; playButton.setAttribute('aria-label', 'Pause video');
  });
  video.addEventListener('pause', () => {
    box.classList.remove('playing'); playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play video');
  });
  const enforceEnd = () => {
    if (video.currentTime >= end - 0.03) {
      video.currentTime = start;
      if (state.visible && !state.userPaused) play();
    }
    display();
  };
  video.addEventListener('timeupdate', enforceEnd);
  video.addEventListener('ended', enforceEnd);
  video.addEventListener('seeking', () => {
    if (state.ready && (video.currentTime < start - 0.05 || video.currentTime > end)) video.currentTime = start;
  });
  const toggle = () => {
    if (video.paused) {
      state.userPaused = false;
      if (!state.ready) { load(); video.addEventListener('loadedmetadata', play, { once: true }); }
      else play();
    } else { state.userPaused = true; video.pause(); }
  };
  playButton.addEventListener('click', toggle);
  box.querySelector('.center-play').addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  scrub.addEventListener('input', () => { if (state.ready) { video.currentTime = start + Math.min(Number(scrub.value), duration - 0.05); display(); } });
  box.querySelector('.restart').addEventListener('click', () => {
    state.userPaused = false;
    if (state.ready) video.currentTime = start;
    else { load(); video.addEventListener('loadedmetadata', play, { once: true }); }
    play();
  });
  const fullscreen = box.querySelector('.fullscreen');
  if (!box.requestFullscreen && !video.webkitEnterFullscreen) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (box.requestFullscreen) await box.requestFullscreen();
    else video.webkitEnterFullscreen();
  });
  display();
}
const preload = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    players.find(p => p.box === entry.target).load();
    preload.unobserve(entry.target);
  }
}, { rootMargin: '200px' });
const playback = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const state = players.find(p => p.box === entry.target);
    state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
    if (!state.visible) state.video.pause();
    else if (!state.userPaused && !reducedMotion.matches && !document.hidden) state.play();
  }
}, { threshold: 0.35 });
players.forEach(p => { preload.observe(p.box); playback.observe(p.box); });
document.addEventListener('visibilitychange', () => {
  for (const state of players) {
    if (document.hidden) state.video.pause();
    else if (state.visible && !state.userPaused && !reducedMotion.matches) state.play();
  }
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) players.forEach(p => p.video.pause()); });
const links = [...document.querySelectorAll('.nav nav a')];
const chapters = [...document.querySelectorAll('.chapter')];
const updateNav = () => {
  const current = [...chapters].reverse().find(section => section.getBoundingClientRect().top <= window.innerHeight * 0.45);
  for (const link of links) {
    const active = current && link.hash === `#${current.id}`;
    link.classList.toggle('active', Boolean(active));
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  }
};
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();
