/* ============================================
   Speaker Agent AI - Frontend JS
   ============================================ */

(function () {
  'use strict';

  // ---- Scroll Fade-In Animation ----
  function initFadeIn() {
    const els = document.querySelectorAll('.fade-in');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
  }

  // ---- Fetch Waitlist Stats ----
  function loadStats() {
    const countEl = document.getElementById('waitlist-count');
    const spotsEl = document.getElementById('spots-remaining');

    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (countEl) {
          // Show at least a base number for social proof
          const display = Math.max(data.waitlistCount, 0);
          countEl.textContent = display;
        }
        if (spotsEl) {
          spotsEl.textContent = data.spotsRemaining;
        }
      })
      .catch(() => {
        // Silently fail - leave defaults
      });
  }

  // ---- Get referral code from URL ----
  function getRefCode() {
    var params = new URLSearchParams(window.location.search);
    return params.get('ref') || '';
  }

  // ---- Show referral banner if referred ----
  function initReferralBanner() {
    var refCode = getRefCode();
    if (!refCode) return;

    // Only show on the main waitlist page
    var heroForm = document.getElementById('hero-form');
    if (!heroForm) return;

    var banner = document.createElement('div');
    banner.style.cssText = 'text-align:center;padding:12px 20px;font-size:14px;color:var(--accent-gold);letter-spacing:0.04em;border-bottom:1px solid var(--border-gold);background:rgba(201,168,76,0.06);';
    banner.textContent = 'You were referred by a Founding Member';

    var pageWrapper = document.querySelector('.page-wrapper');
    if (pageWrapper) {
      pageWrapper.insertBefore(banner, pageWrapper.firstChild);
    }
  }

  // ---- Waitlist Form Submission ----
  function initWaitlistForms() {
    var forms = document.querySelectorAll('#hero-form, #footer-form');
    var refCode = getRefCode();

    forms.forEach((form) => {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var emailInput = form.querySelector('input[type="email"]');
        var email = emailInput.value.trim();
        var btn = form.querySelector('button');
        var msgId = form.id === 'hero-form' ? 'hero-form-message' : 'footer-form-message';
        var msgEl = document.getElementById(msgId);

        if (!email) return;

        // Set loading state
        btn.classList.add('btn-loading');
        var originalText = btn.textContent;
        btn.textContent = 'Joining...';

        var payload = { email: email };
        if (refCode) {
          payload.ref = refCode;
        }

        fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              showMessage(msgEl, data.error, 'error');
              btn.classList.remove('btn-loading');
              btn.textContent = originalText;
            } else {
              // Success - redirect to thank you page
              window.location.href = '/thanks';
            }
          })
          .catch(() => {
            showMessage(msgEl, 'Something went wrong. Please try again.', 'error');
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
          });
      });
    });
  }

  // ---- Beta Application Form ----
  function initBetaForm() {
    const form = document.getElementById('beta-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        linkedin: formData.get('linkedin'),
        topic: formData.get('topic'),
        engagements: formData.get('engagements'),
        feeRange: formData.get('feeRange'),
      };

      const btn = form.querySelector('button[type="submit"]');
      const msgEl = document.getElementById('beta-form-message');

      // Validate required fields
      if (!data.name || !data.email || !data.topic) {
        showMessage(msgEl, 'Please fill in all required fields.', 'error');
        return;
      }

      // Set loading state
      btn.classList.add('btn-loading');
      const originalText = btn.textContent;
      btn.textContent = 'Submitting...';

      fetch('/api/beta-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.error) {
            showMessage(msgEl, result.error, 'error');
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
          } else {
            // Success - redirect to beta thank you
            window.location.href = '/beta-thanks';
          }
        })
        .catch(() => {
          showMessage(msgEl, 'Something went wrong. Please try again.', 'error');
          btn.classList.remove('btn-loading');
          btn.textContent = originalText;
        });
    });
  }

  // ---- Alpha Form Submission ----
  function initAlphaForm() {
    var form = document.getElementById('alpha-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var formData = new FormData(form);
      var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        linkedin: formData.get('linkedin'),
        topic: formData.get('topic'),
        relationship: formData.get('relationship'),
      };

      var btn = form.querySelector('button[type="submit"]');
      var msgEl = document.getElementById('alpha-form-message');

      // Validate required fields
      if (!data.name || !data.email || !data.topic || !data.relationship) {
        showMessage(msgEl, 'Please fill in all required fields.', 'error');
        return;
      }

      // Set loading state
      btn.classList.add('btn-loading');
      var originalText = btn.textContent;
      btn.textContent = 'Accepting...';

      fetch('/api/alpha-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.error) {
            showMessage(msgEl, result.error, 'error');
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
          } else if (result.success && result.ref_code) {
            // Success - redirect to alpha thank you with ref code
            window.location.href = '/alpha-thanks?ref=' + encodeURIComponent(result.ref_code);
          }
        })
        .catch(function () {
          showMessage(msgEl, 'Something went wrong. Please try again.', 'error');
          btn.classList.remove('btn-loading');
          btn.textContent = originalText;
        });
    });
  }

  // ---- Show Form Message ----
  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;

    // Auto-clear after 5 seconds
    setTimeout(() => {
      el.textContent = '';
      el.className = 'form-message';
    }, 5000);
  }

  // ---- Initialize ----
  document.addEventListener('DOMContentLoaded', function () {
    initFadeIn();
    loadStats();
    initWaitlistForms();
    initBetaForm();
    initAlphaForm();
    initReferralBanner();
  });
})();
