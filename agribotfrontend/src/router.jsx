import ControlPage from "./pages/Controller/ControlPage";
import DataPage from "./pages/DataView/DataPage";
import FieldDetails from "./pages/Fields/FieldDetails";
import NewFieldPage from "./pages/Fields/NewFieldPage";
import MainPage from "./pages/MainHome/MainPage";

const routes = [
  {
    name: 'root',
    path: '/',
    element: MainPage,
  },
  {
    name: 'controller',
    path: '/controller',
    element: ControlPage,
  },
  {
    name: 'loc-data',
    path: '/loc-data',
    element: DataPage,
  },
  {
    name: 'New Field',
    path: '/fields/add',
    element: NewFieldPage,
  },
  {
    name: 'Field Details',
    path: '/fields/:id',
    element: FieldDetails,
  }
];

export default routes;