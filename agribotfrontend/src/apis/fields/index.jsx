import AXIOS_INSTANCE from '../axios';

export const fetchFieldsApi = () => AXIOS_INSTANCE.get('/core/fields/');

export const fetchFieldsBySearchApi = search =>
  AXIOS_INSTANCE.get(`/core/fields/?search=${search}`);

export const createFieldApi = formData =>
  AXIOS_INSTANCE.post('/core/fields/', formData);

export const fetchFieldApi = id =>
  AXIOS_INSTANCE.get(`/core/fields/${id}/`);

export const fetchFieldDataApi = () => 
  AXIOS_INSTANCE.get('/core/field-data/');