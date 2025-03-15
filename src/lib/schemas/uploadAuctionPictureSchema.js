const schema = {
  type: "object",
  properties: {
    body: {
      type: "string", // Asegura que el body es un string
      minLength: 1, // No puede estar vacío
      pattern: "=$", // Debe terminar con "="
    },
  },
  required: ["body"], // El body es obligatorio
};

export default schema;
