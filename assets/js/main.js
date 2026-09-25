/* =========================================================================
   Greenberg Acupuncture Chiropractic — site behaviour
   Vanilla JS, no dependencies.
   ========================================================================= */
(function () {
  'use strict';

  var doc = document;

  /* ---------------------------------------------------------------------
     Footer year
     --------------------------------------------------------------------- */
  var yearEl = doc.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------------- */
  var toggle = doc.getElementById('navToggle');
  var nav = doc.getElementById('primaryNav');

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    doc.body.classList.remove('nav-open');
  }

  function openNav() {
    if (!nav || !toggle) return;
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    doc.body.classList.add('nav-open');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeNav();
      else openNav();
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ---------------------------------------------------------------------
     Sticky header shadow + back-to-top visibility
     --------------------------------------------------------------------- */
  var header = doc.getElementById('siteHeader');
  var toTop = doc.getElementById('toTop');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || doc.documentElement.scrollTop;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!revealEls.length) {
    /* nothing to do */
  } else if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call(el.parentNode.children).filter(function (n) {
          return n.classList && n.classList.contains('reveal');
        });
        var delay = Math.min(siblings.indexOf(el), 5) * 80;
        setTimeout(function () { el.classList.add('is-visible'); }, delay);
        observer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Scroll-spy for in-page nav links (home page)
     --------------------------------------------------------------------- */
  var spyLinks = Array.prototype.slice.call(doc.querySelectorAll('.nav__link[href^="#"]'));
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var sectionMap = {};
    spyLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = id && doc.getElementById(id);
      if (section) sectionMap[id] = link;
    });

    var sections = Object.keys(sectionMap).map(function (id) { return doc.getElementById(id); });
    if (sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = sectionMap[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            spyLinks.forEach(function (l) { l.classList.remove('is-active'); });
            link.classList.add('is-active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ---------------------------------------------------------------------
     Health library filtering
     --------------------------------------------------------------------- */
  var filterBtns = Array.prototype.slice.call(doc.querySelectorAll('.filter-btn'));
  var articles = Array.prototype.slice.call(doc.querySelectorAll('.article[data-cat]'));
  var noResults = doc.getElementById('noResults');

  function applyFilter(value) {
    var shown = 0;

    articles.forEach(function (article) {
      var cats = (article.getAttribute('data-cat') || '').split(/\s+/);
      var match = value === 'all' || cats.indexOf(value) !== -1;
      article.hidden = !match;
      if (match) shown++;
    });

    filterBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === value);
      btn.setAttribute('aria-pressed', btn.getAttribute('data-filter') === value ? 'true' : 'false');
    });

    if (noResults) noResults.classList.toggle('is-visible', shown === 0);
  }

  if (filterBtns.length && articles.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    /* Allow deep links such as health-library.html#seasonal to preselect a topic */
    var knownFilters = filterBtns.map(function (b) { return b.getAttribute('data-filter'); });
    var hash = (window.location.hash || '').slice(1);
    if (hash && knownFilters.indexOf(hash) !== -1) {
      applyFilter(hash);
      var bar = doc.querySelector('.filter-bar');
      if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      applyFilter('all');
    }

    window.addEventListener('hashchange', function () {
      var h = (window.location.hash || '').slice(1);
      if (h && knownFilters.indexOf(h) !== -1) applyFilter(h);
    });
  }

  /* ---------------------------------------------------------------------
     Appointment request form
     There is no backend on this static site, so the form validates input
     and then hands the visitor straight to phone / text, which is how the
     practice actually books appointments.
     --------------------------------------------------------------------- */
  var form = doc.getElementById('contactForm');
  var status = doc.getElementById('formStatus');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.querySelector('#name');
      var phone = form.querySelector('#phone');
      var reason = form.querySelector('#reason');

      var missing = [];
      if (!name.value.trim()) missing.push('your name');
      if (!phone.value.trim()) missing.push('a phone number');

      if (missing.length) {
        status.textContent = 'Please add ' + missing.join(' and ') + ' so Dr. Geri can reach you.';
        status.classList.add('is-visible');
        (missing[0] === 'your name' ? name : phone).focus();
        return;
      }

      var first = name.value.trim().split(/\s+/)[0];
      status.innerHTML = 'Thank you, ' + escapeHtml(first) +
        '. Your request about <strong>' + escapeHtml(reason.value) +
        '</strong> is noted. For the fastest response, call or text Dr. Geri at ' +
        '<a href="tel:+18183241539">(818) 324-1539</a> — mention this request and she will confirm a time.';
      status.classList.add('is-visible');
      form.reset();
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
