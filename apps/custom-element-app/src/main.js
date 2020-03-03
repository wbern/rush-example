import Vue from 'vue'
import App from './App.vue'
import Testing from './Testing.vue'
import SubTesting from './SubTesting.vue'
import vueCustomElement from 'vue-custom-element'

Vue.config.productionTip = false

Vue.use(vueCustomElement)

Vue.customElement('t-t', Testing)
Vue.customElement('s-s', SubTesting)

new Vue({
    render: h => h(App),
}).$mount('#app')
