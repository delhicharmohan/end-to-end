import { createApp, defineAsyncComponent } from "vue";

import router from "./router.js";
import store from "./store/index.js";
import App from "./App.vue";
import BaseCard from "./components/ui/BaseCard.vue";
import BaseButton from "./components/ui/BaseButton.vue";
import BaseBadge from "./components/ui/BaseBadge.vue";
import BaseSpinner from "./components/ui/BaseSpinner.vue";
import BaseToast from "./components/ui/BaseToast.vue";
import BaseToggle from "./components/ui/BaseToggle.vue";
import BaseModal from "./components/ui/BaseModal.vue";
import BaseFullModal from "./components/ui/BaseFullModal.vue";
import BasePageSpinner from "./components/ui/BasePageSpinner.vue";
import BasePageSpinnerNew from "./components/ui/BasePageSpinnerNew.vue";
import VueConfetti from "vue-confetti";
import VueSweetalert2 from "vue-sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import VueApexCharts from "vue3-apexcharts";

const BaseDialog = defineAsyncComponent(() =>
  import("./components/ui/BaseDialog.vue")
);

import BlankLayout from "./layouts/blank.vue";
import DashboardLayout from "./layouts/dashboard.vue";

import "./assets/main.css";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

/* import font awesome icon component */
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

/* import specific icons */
import {
  faDashboard,
  faCoins,
  faMoneyBill,
  faMoneyBillTrendUp,
  faMoneyBillTransfer,
  faMoneyCheck,
  faMoneyBillWave,
  faMoneyBillWheat,
  faMoneyBill1,
  faInr,
} from "@fortawesome/free-solid-svg-icons";
// import { faCoins } from "@fortawesome/free-solid-svg-icons";
// import { faMoneyBill } from "@fortawesome/free-solid-svg-icons";
// import { faMoneyBillTrendUp } from "@fortawesome/free-solid-svg-icons";
// import { faMoneyBillTransfer } from "@fortawesome/free-solid-svg-icons";

/* add icons to the library */
library.add(
  faDashboard,
  faCoins,
  faMoneyBill,
  faMoneyBillTrendUp,
  faMoneyBillTransfer,
  faMoneyCheck,
  faMoneyBillWave,
  faMoneyBillWheat,
  faMoneyBill1,
  faInr,
);

const app = createApp(App);

app.use(router);
app.use(store);
app.use(VueConfetti);
app.use(VueSweetalert2);
app.use(VueApexCharts);

app.component("blank-layout", BlankLayout);
app.component("dashboard-layout", DashboardLayout);
app.component("base-card", BaseCard);
app.component("base-button", BaseButton);
app.component("base-badge", BaseBadge);
app.component("base-spinner", BaseSpinner);
app.component("base-dialog", BaseDialog);
app.component("base-toast", BaseToast);
app.component("base-toggle", BaseToggle);
app.component("base-modal", BaseModal);
app.component("base-full-modal", BaseFullModal);
app.component("base-page-spinner", BasePageSpinner);
app.component("base-page-spinner-new", BasePageSpinnerNew);
app.component("font-awesome-icon", FontAwesomeIcon);

app.mount("#app");
