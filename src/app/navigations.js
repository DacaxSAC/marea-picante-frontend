export const navigations = [
  { name: "Dashboard", path: "/dashboard/default", icon: "dashboard" },
  { label: "PROCESOS OPERATIVOS", type: "label" },
  {
    name: "Ventas",
    icon: "security",
    children: [
      { name: "Órdenes", iconText: "SI", path: "/session/signin" },
      { name: "Mesas", iconText: "SU", path: "/ventas/mesas" },
      { name: "Clientes", iconText: "FP", path: "/session/forgot-password" },
    ]
  },
  {
    name: "Inventario",
    icon: "security",
    children: [
      { name: "Productos", iconText: "SI", path: "/inventario/productos" },
      { name: "Categorías", iconText: "SU", path: "/inventario/categorias" },
      { name: "Kardex", iconText: "FP", path: "/inventario/productos" },
    ]
  },
  { label: "PROCESOS DE GESTIÓN", type: "label" },
  {
    name: "Administración",
    icon: "security",
    children: [
      { name: "Empleados", iconText: "SI", path: "/session/signin" },
      { name: "Usuarios", iconText: "SU", path: "/administracion/usuarios" },
      { name: "Configuración", iconText: "FP", path: "/session/forgot-password" },
    ]
  },
  {
    name: "Caja",
    icon: "security",
    children: [
      { name: "Apertura/Cierre", iconText: "SI", path: "/session/signin" },
      { name: "Movimientos", iconText: "SU", path: "/session/signup" },
      { name: "Reportes", iconText: "SU", path: "/session/signup" }
    ]
  },
  // { label: "PAGES", type: "label" },
  // {
  //   name: "Session/Auth",
  //   icon: "security",
  //   children: [
  //     { name: "Sign in", iconText: "SI", path: "/session/signin" },
  //     { name: "Sign up", iconText: "SU", path: "/session/signup" },
  //     { name: "Forgot Password", iconText: "FP", path: "/session/forgot-password" },
  //     { name: "Error", iconText: "404", path: "/session/404" }
  //   ]
  // },
  // { label: "Components", type: "label" },
  // {
  //   name: "Components",
  //   icon: "favorite",
  //   badge: { value: "30+", color: "secondary" },
  //   children: [
  //     { name: "Auto Complete", path: "/material/autocomplete", iconText: "A" },
  //     { name: "Buttons", path: "/material/buttons", iconText: "B" },
  //     { name: "Checkbox", path: "/material/checkbox", iconText: "C" },
  //     { name: "Dialog", path: "/material/dialog", iconText: "D" },
  //     { name: "Expansion Panel", path: "/material/expansion-panel", iconText: "E" },
  //     { name: "Form", path: "/material/form", iconText: "F" },
  //     { name: "Icons", path: "/material/icons", iconText: "I" },
  //     { name: "Menu", path: "/material/menu", iconText: "M" },
  //     { name: "Progress", path: "/material/progress", iconText: "P" },
  //     { name: "Radio", path: "/material/radio", iconText: "R" },
  //     { name: "Switch", path: "/material/switch", iconText: "S" },
  //     { name: "Slider", path: "/material/slider", iconText: "S" },
  //     { name: "Snackbar", path: "/material/snackbar", iconText: "S" },
  //     { name: "Table", path: "/material/table", iconText: "T" }
  //   ]
  // },
  // {
  //   name: "Charts",
  //   icon: "trending_up",
  //   children: [{ name: "Echarts", path: "/charts/echarts", iconText: "E" }]
  // },
  // {
  //   name: "Documentation",
  //   icon: "launch",
  //   type: "extLink",
  //   path: "http://demos.ui-lib.com/matx-react-doc/"
  // }
];
