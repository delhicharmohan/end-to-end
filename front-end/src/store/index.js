import { createStore } from "vuex";

import authModule from "./modules/auth/index.js";
import usersModule from "./modules/users/index.js";
import subadminModule from "./modules/subadmin/index.js";
import payInModule from "./modules/payin/index.js";
import clientsModule from "./modules/clients/index.js";
import reportsModule from "./modules/reports/index.js";
import VendorModule from "./modules/vendor/index.js";
import SupportUserModule from "./modules/support-user/index.js";
import OrderCreatorModule from "./modules/order-creator/index.js";

const store = createStore({
  modules: {
    auth: authModule,
    users: usersModule,
    subadmin: subadminModule,
    payin: payInModule,
    clients: clientsModule,
    reports: reportsModule,
    vendor: VendorModule,
    supportuser: SupportUserModule,
    ordercreator: OrderCreatorModule,
  },
});

export default store;
