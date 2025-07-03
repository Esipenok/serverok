// Функция для расчета возраста по дате рождения
function calculateAge(birthDateStr) {
  if (!birthDateStr) return 0;
  try {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    console.error('Error calculating age:', e);
    return 0;
  }
}

module.exports = calculateAge;
