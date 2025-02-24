import AXIOS_INSTANCE from '../axios';

export const fetchFieldsApi = () => AXIOS_INSTANCE.get('/core/fields/');

export const fetchFieldsBySearchApi = search =>
  AXIOS_INSTANCE.get(`/core/fields/?search=${search}`);

export const createFieldApi = formData =>
  AXIOS_INSTANCE.post('/core/fields/', formData);