// booking.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.js-booking-trigger');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // tutaj odpalasz modal lub przekierowanie
    // np. modal:
    openBookingModal({ preferredType: 'IN_PERSON' });

    // albo przekierowanie:
    // window.location.href = '/booking.html?type=IN_PERSON';
  });
});
