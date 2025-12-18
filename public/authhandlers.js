document.querySelectorAll('.response-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      donationId: formData.get('donationId'),
      status: formData.get('status'),
      reason: formData.get('reason') || null,
      customMessage: formData.get('customMessage') || ''
    };

    try {
      const res = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      alert(result.message || 'Response submitted successfully.');
      form.reset();
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit response. Please try again.');
    }
  });
});
