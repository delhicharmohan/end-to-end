import { defineAsyncComponent } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import UserAuth from './pages/auth/UserAuth.vue';
import Pay from './pages/pay/index.vue';
import InstantWithdraw from './pages/instant-withdraw/index.vue';
import WithdrawalSuccess from './pages/instant-withdraw/success.vue';
import CreatePayIn from './pages/manual-order/create-payin.vue';
import CreatePayOut from './pages/manual-order/create-payout.vue';
import Deposit from './pages/deposit/index.vue';
import Success from './pages/manual-order/success.vue';
import Pending from './pages/manual-order/pending.vue';
import Failed from './pages/manual-order/failed.vue';
import NotFound from './pages/NotFound.vue';
import NoPermission from './pages/NoPermission.vue';
import store from './store/index.js';

const Dashboard = defineAsyncComponent(() =>
  import('./pages/dashboard/index.vue')
);

const PayIn = defineAsyncComponent(() => import('./pages/payin/index.vue'));
const Callback = defineAsyncComponent(() =>
  import('./pages/callback/index.vue')
);
const PayOut = defineAsyncComponent(() => import('./pages/payout/index.vue'));
const InstantPayOut = defineAsyncComponent(() =>
  import('./pages/instant-payout/index.vue')
);
const Users = defineAsyncComponent(() => import('./pages/users/index.vue'));
const SubAdmin = defineAsyncComponent(() =>
  import('./pages/sub-admin/index.vue')
);
const Clients = defineAsyncComponent(() => import('./pages/clients/index.vue'));
const Reports = defineAsyncComponent(() => import('./pages/reports/index.vue'));
const Vendor = defineAsyncComponent(() => import('./pages/vendor/index.vue'));
const SupportUser = defineAsyncComponent(() =>
  import('./pages/support-user/index.vue')
);
const OrderCreator = defineAsyncComponent(() =>
  import('./pages/order-creator/index.vue')
);
const ManualOrder = defineAsyncComponent(() =>
  import('./pages/manual-order/index.vue')
);
const UploadStatement = defineAsyncComponent(() =>
  import('./pages/upload-statement/index.vue')
);
const ResetPassword = defineAsyncComponent(() =>
  import('./pages/reset-password/index.vue')
);

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: UserAuth,
      meta: {
        requiresUnauth: true,
        layout: 'blank'
      }
    },
    {
      path: '/login',
      component: UserAuth,
      meta: {
        requiresUnauth: true,
        layout: 'blank'
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/payin',
      name: 'Pay In',
      component: PayIn,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/callback',
      name: 'Callback',
      component: Callback,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/payout',
      name: 'Pay Out',
      component: PayOut,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },

    {
      path: '/instant-payout',
      name: 'Instant Pay Out',
      component: InstantPayOut,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/manual-order',
      name: 'Manual Orders',
      component: ManualOrder,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/users',
      name: 'Users',
      component: Users,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/sub-admin',
      name: 'Sub Admins',
      component: SubAdmin,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/vendor',
      name: 'Vendors',
      component: Vendor,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/order-creator',
      name: 'Order Creators',
      component: OrderCreator,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/support-user',
      name: 'Support Users',
      component: SupportUser,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },

    {
      path: '/instant-withdraw/:id',
      name: 'Withdraw',
      component: InstantWithdraw,
      layout: 'blank',
      props: route => ({ id: route.params.id || '' })
    },
    {
      path: '/instant-withdraw/success',
      name: 'Withdrawal Success',
      component: WithdrawalSuccess,
      layout: 'blank'
    },
    {
      path: '/pay/:id',
      name: 'Pay',
      component: Pay,
      layout: 'blank',
      props: route => ({ id: route.params.id || '' })
    },
    {
      path: '/create-payin/:refID',
      name: 'Create Pay In',
      component: CreatePayIn,
      layout: 'blank',
      props: route => ({ refID: route.params.refID || '' })
    },
    {
      path: '/create-payout/:refID',
      name: 'Create Pay Out',
      component: CreatePayOut,
      layout: 'blank',
      props: route => ({ refID: route.params.refID || '' })
    },
    {
      path: '/deposit/:vendor',
      name: 'Deposit',
      component: Deposit,
      layout: 'blank',
      props: route => ({ vendor: route.params.vendor || '' })
    },
    {
      path: '/success',
      name: 'Success',
      component: Success,
      layout: 'blank'
    },
    {
      path: '/pending',
      name: 'Pending',
      component: Pending,
      layout: 'blank'
    },
    {
      path: '/failed',
      name: 'Failed',
      component: Failed,
      layout: 'blank'
    },
    {
      path: '/clients',
      name: 'Clients',
      component: Clients,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/reports',
      name: 'Reports',
      component: Reports,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/upload-statement',
      name: 'Upload Statement',
      component: UploadStatement,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/reset-password',
      name: 'Reset Password',
      component: ResetPassword,
      meta: {
        requiresAuth: true,
        layout: 'dashboard'
      }
    },
    {
      path: '/:notFound(.*)',
      component: NotFound,
      meta: {
        layout: 'blank'
      }
    },
    {
      path: '/no-permission',
      component: NoPermission,
      meta: { layout: 'dashboard', requiresAuth: true }
    }
  ]
});

const adminRestrictedPath = ['/clients', '/vendor', '/reset-password'];
const userRestrictedPath = [
  '/users',
  '/clients',
  'reports',
  '/upload-statement',
  '/reset-password'
];
const subAdminrestrictedPath = [
  '/users',
  '/clients',
  'reports',
  '/support-user',
  '/vendor',
  'order-creator',
  '/upload-statement'
];
const userPermissionPath = ['/payin', '/payout', '/reset-password'];
const supportrestrictedPath = [
  '/users',
  '/clients',
  'reports',
  '/support-user',
  '/vendor',
  '/payin',
  '/payout',
  '/order-creator',
  '/upload-statement',
  '/reset-password'
];
const orderCreatorRestrictedPath = [
  '/users',
  '/clients',
  'reports',
  '/support-user',
  '/vendor',
  '/payin',
  '/payout',
  '/order-creator',
  '/upload-statement',
  '/reset-password'
];

router.beforeEach(function(to, _, next) {
  if (to.meta.requiresAuth && !store.getters.isAuthenticated) {
    next('/');
  } else if (to.meta.requiresUnauth && store.getters.isAuthenticated) {
    next('/dashboard');
  } else {
    if (store.getters.isSuperAdmin) {
      next();
    } else if (store.getters.isAdmin) {
      if (adminRestrictedPath.includes(to.path)) {
        next('/no-permission');
      } else {
        next();
      }
    } else if (store.getters.isSubAdmin) {
      if (subAdminrestrictedPath.includes(to.path)) {
        next('/no-permission');
      } else {
        next();
      }
    } else if (store.getters.isOrderCreator) {
      if (orderCreatorRestrictedPath.includes(to.path)) {
        next('/no-permission');
      } else {
        next();
      }
    } else if (store.getters.isSupport) {
      if (supportrestrictedPath.includes(to.path)) {
        next('/no-permission');
      } else {
        next();
      }
    } else if (store.getters.isUser) {
      if (userRestrictedPath.includes(to.path)) {
        next('/no-permission');
      } else {
        if (userPermissionPath.includes(to.path)) {
          if (to.path == '/payin') {
            if (store.getters.payInStatus == '0') {
              next('/no-permission');
            } else {
              next();
            }
          } else if (to.path == '/payout') {
            if (store.getters.payOutStatus == '0') {
              next('/no-permission');
            } else {
              next();
            }
          } else {
            next();
          }
        } else {
          next();
        }
      }
    } else {
      next();
    }
  }
});

export default router;
