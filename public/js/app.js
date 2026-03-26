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

  // ---- Waitlist Form Submission ----
  function initWaitlistForms() {
    const forms = document.querySelectorAll('#hero-form, #footer-form');

    forms.forEach((form) => {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        const btn = form.querySelector('button');
        const msgId = form.id === 'hero-form' ? 'hero-form-message' : 'footer-form-message';
        const msgEl = document.getElementById(msgId);

        if (!email) return;

        // Set loading state
        btn.classList.add('btn-loading');
        const originalText = btn.textContent;
        btn.textContent = 'Joining...';

        fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
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
  });
})();
