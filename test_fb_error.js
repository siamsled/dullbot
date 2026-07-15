const id = 12345;
console.log(JSON.stringify({ recipient: { id } }));
const strId = "12345";
console.log(JSON.stringify({ recipient: { id: strId } }));
