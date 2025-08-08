import axios from 'axios';

let baseURL = process.env.VUE_APP_API_URL;
const hostName = window.location.hostname;
const protocol = window.location.protocol;

if (hostName === 'api.wizpayy.com') {
  baseURL = protocol + '//api.wizpayy.com/api/v1';
} else if (hostName === 'wizpayy.com') {
  baseURL = protocol + '//wizpayy.com/api/v1';
} else if (hostName == 'localhost') {
  baseURL = protocol + '//localhost:3000/api/v1';
} else if (hostName === 'best-live-404609.uc.r.appspot.com') {
  baseURL = protocol + '//best-live-404609.uc.r.appspot.com/api/v1';
} else if (hostName == '34.27.183.239') {
  baseURL = protocol + '//34.27.183.239:80/api/v1';
} else if (hostName == 'zinggale.com') {
  baseURL = protocol + '//zinggale.com/api/v1';
} else {
  baseURL = protocol + '//' + hostName + '/api/v1';
}

export default axios.create({
  baseURL,
  headers: {
    'Content-type': 'application/json'
  },
  withCredentials: true
});
