const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async function () {
  const arrayBuffer = await this.files[0].arrayBuffer();
  const answer = isAnimated(arrayBuffer) ? 'Yes' : 'No';
  alert(`Is "${this.files[0].name}" animated? ${answer}.`);
});
