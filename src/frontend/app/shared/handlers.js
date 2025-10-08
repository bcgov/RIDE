import { getCookie } from "./helpers.js";

export const handleFormSubmit = (e) => {
  // Get the form element
  const form = e.currentTarget;

  // Find the CSRF token input and update it with the latest value
  const csrfInput = form.querySelector('input[name="csrfmiddlewaretoken"]');
  if (csrfInput) {
    csrfInput.value = getCookie('csrftoken');
  }
};
