<template>
  <section @contextmenu.prevent class="min-h-screen w-full flex flex-col bg-blue-50 justify-center items-center px-4 sm:px-6 py-8">
    <!-- Chat Window Component -->
    <ChatWindow 
      v-if="orderId"
      ref="chatWindow"
      :order-id="orderId"
      :user-id="null"
      :user-type="'payer'"
      :initial-messages="[]"
      :expires-at="null"
      :hide-when-closed="true"
      @unread-count-changed="onChatUnreadCountChanged"
      class="fixed bottom-4 right-4 z-40"
    />
    <base-page-spinner v-if="showTransactionBar"></base-page-spinner>
    <base-dialog :show="!!error" title="An error occurred!" @close="closeTheDialogBox">
      <p>{{ error }}</p>
    </base-dialog>
    <transition v-if="showForm" name="slide-right" mode="out-in">
      <div key="1" v-if="isUpiIdSubmitted"
        class="w-100-per sm:w-400 bg-white shadow-2xl rounded-3xl border border-blue-600 flex flex-col overflow-hidden">
        <div
          v-if="paymentMethod === 'UPI' || paymentMethod === 'automatic_payment_with_sms' || paymentMethod === 'automatic_payment_with_extension' || paymentMethod === 'static_qr' || paymentMethod === 'chrome_extension_with_decimal'"
          class="flex justify-between items-center bg-blue-700 p-4 text-white">
          <div>Payment Time Left</div>
          <vue-countdown class="flex items-center px-2 py-1 bg-blue-600 text-white rounded-lg" @start="countDownStarted"
            @progress="onCountdownProgress" @end="countDownEnd" :time="countDownLimit" v-slot="{ minutes, seconds }">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="w-5 h-5 text-white">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="w-3 flex items-center ml-1 text-white">
              {{ minutes }}
            </div>
            <div class="flex items-center justify-center leading-none pb-1 mr-1">
              :
            </div>
            <div class="w-6 flex items-center text-white">
              {{ seconds }}
            </div>
          </vue-countdown>
        </div>
        <div v-else class="flex justify-between items-center bg-blue-700 p-4 text-white">
          <div>Payment Details</div>
        </div>
        <div class="flex flex-col items-center text-center p-4">
          <!-- <div @click.stop="openTicketForm" class="text-red-600 mb-4 font-bold cursor-pointer">Click Here for Old Payments
          </div> -->
          <div v-if="isHighAmount" class="text-sm leading-tight mb-2">
            <div
              v-if="paymentMethod === 'UPI' || paymentMethod === 'automatic_payment_with_sms' || paymentMethod === 'automatic_payment_with_extension' || paymentMethod === 'chrome_extension_with_decimal'">
              <div>Scan & Pay upto 1 Lakh</div>
              <div>Enter the same amount and submit the UTR</div>
            </div>
            <div v-else-if="paymentMethod === 'static_qr'">
              <div>Screenshot & Pay upto 1 Lakh</div>
              <div>Enter the same amount and submit the UTR</div>
            </div>
          </div>
          <div class="text-sm font-semibold flex items-center space-x-2">
            <span>Transfer Amount</span>
            <!-- Inline Chat Icon Button -->
            <button
              v-if="orderId"
              @click.stop="openChatPanel"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 relative"
              title="Chat support"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 15a4 4 0 01-4 4H8l-5 3v-3a4 4 0 01-4-4V7a4 4 0 014-4h14a4 4 0 014 4v8z"/>
              </svg>
              <!-- Red notification dot -->
              <div v-if="chatUnreadCount > 0" class="chat-notification-dot"></div>
            </button>
          </div>
          <div class="text-2xl font-bold" :class="isHighAmount ? 'text-blue-600' : ''">Rs. {{ amount }}/-</div>
          <div
            v-if="paymentMethod === 'UPI' || paymentMethod === 'automatic_payment_with_sms' || paymentMethod === 'automatic_payment_with_extension' || paymentMethod === 'static_qr' || paymentMethod === 'chrome_extension_with_decimal'"
            class="flex flex-col w-full">

            <div v-if="paymentMethod === 'automatic_payment_with_sms' && txnFee > 0" class="">
              <div class="text-xs font-light text-gray-400">Discount: {{ diffAmount }}</div>
            </div>

            <div v-if="!isHighAmount" class="text-sm font-bold">Scan QR and Pay</div>
            <div v-if="showAppButtons" class="text-sm font-bold">
              Scan QR to pay, or choose an app below
            </div>
            <div v-if="showAppButtons" class="text-sm font-bold">
              Do not screenshot the QR
            </div>
            <div v-if="paymentMethod === 'static_qr'" class="flex justify-center">
              <div class="p-2 border shadow-lg">
                <img :src="statiqQr" class="h-32 sm:h-64" alt="static_qr">
              </div>
            </div>
            <div v-else class="mt-4 flex justify-center">
              <div class="p-2 border shadow-lg">
                <qr-code :text="qrCodeText" :size="getQrCodeSize" ref="qrCode"></qr-code>
              </div>
            </div>

            <div v-if="isHighAmount" class="text-blue-100 text-xxs mt-1">Don't use the same QR code to pay multiple times
            </div>

            <div class="mt-4 w-full flex items-center justify-center">
              <span class="text-gray-400 leading-none mr-1">Receipt:</span>
              <span class="font-medium leading-none uppercase">{{ receiptId }}</span>
            </div>

            <!-- Always show UPI ID with copy-to-clipboard -->
            <div v-if="validatorUPIID" class="mt-2 w-full flex items-center justify-center">
              <div class="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                <span class="text-gray-600 text-xs mr-2">UPI ID</span>
                <span class="text-blue-700 text-sm font-semibold select-all">{{ validatorUPIID }}</span>
                <button class="ml-2" @click.stop="copyToClipBoardUpiId" title="Copy UPI ID">
                  <svg v-if="isUpiIdCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-green-600">
                    <path fill-rule="evenodd" d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z" clip-rule="evenodd"/>
                    <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z"/>
                    <path d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z"/>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-blue-700">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="!isHighAmount" class="grid grid-cols-1 gap-4 mt-4 px-6"
              :class="isPayNow ? 'sm:grid-cols-2' : ''">
              <a v-if="isPayNow" :href="gpayLink"
                class="cursor-pointer border-2 border-blue-600 bg-blue-600 hover:bg-white rounded-lg px-4 py-2 text-white hover:text-blue-600">Pay
                Now</a>
              <div v-if="showDownloadBtn" @click.stop="downloadQrCode"
                class="cursor-pointer border-2 border-blue-600 bg-blue-600 hover:bg-white rounded-lg px-4 py-2 text-white hover:text-blue-600">
                Download QR</div>
            </div>

            <!-- Amount greater than 2000 start -->
            <div v-if="isHighAmount || 1">
              <!-- <div class="mt-4 font-bold">
                Copy the UPI ID below, pay the same amount, and enter the UTR
              </div> -->

              <div class="mt-4 border-2 border-blue-600 px-4 py-8 rounded-lg flex flex-col">
                <div class="flex justify-between items-center">
                  <div v-if="!isEndToPay" @click.stop="selectButton('utr')"
                    :class="selectedButton == 'utr' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-blue-600'"
                    class="hover:bg-wizpay-red hover:text-white text-xs font-semibold flex-grow py-2 rounded-lg cursor-pointer">
                    Enter UTR</div>
                  <div @click.stop="selectButton('screenshot')"
                    :class="selectedButton == 'screenshot' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-blue-600'"
                    class="hover:bg-wizpay-red hover:text-white text-xs font-semibold flex-grow py-2 rounded-lg cursor-pointer ml-2">
                    Upload Screenshot</div>
                  <div v-if="!isEndToPay" @click.stop="selectButton('copy')"
                    :class="selectedButton == 'copy' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-blue-600'"
                    class="hover:bg-wizpay-red hover:text-white text-xs font-semibold flex-grow py-2 rounded-lg cursor-pointer ml-2">
                    Copy UPI ID</div>
                </div>
                <div v-if="selectedButton == ''" class="mt-2 text-xxs text-blue-600">Select the preferred payment
                  option to complete the payment.</div>
                <div v-else>
                  <div v-if="selectedButton == 'utr'">
                    <div class="mt-2">
                      <div v-if="is_utr_enabled_submitted" class="flex justify-center items-center h-8">
                        <p class="text-center text-xs text-green-600">
                          UTR Submitted Successfully!
                        </p>
                      </div>
                      <div v-else class="flex flex-col">
                        <div class="flex-grow">
                          <input type="text" class="h-8 bg-wizpay-gray text-xs text-center" placeholder="Enter UTR"
                            v-model="customerUtr.val" @blur="clearValidity('customerUtr')" />
                        </div>
                        <p v-if="!customerUtr.isValid" class="text-xxs text-red-600 text-center">{{ customerUtr.msg }}
                        </p>
                        <div class="flex justify-center mt-2">
                          <div @click.stop="addCustomerUtr"
                            class="h-8 flex items-center justify-center border px-4 bg-blue-600 hover:bg-white text-white hover:text-blue-600 border-blue-600 rounded-lg cursor-pointer">
                            Submit
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="selectedButton == 'screenshot'">


                    <div class="mt-2">
                      <div v-if="isUploadStatementSubmitted" class="flex justify-center items-center h-8">
                        <p class="text-center text-xs"
                          :class="uploadScreenshotStatus ? 'text-green-600' : 'text-red-600'">
                          {{ uploadScreenshotMsg }}
                        </p>
                      </div>
                      <div v-else class="flex flex-col">
                        <div class="flex-grow">
                          <input ref="uploadScreenshot" class="hidden" id="uploadScreenshot"
                            @change="handleUploadScreenshot" type="file" accept="image/*">
                          <div v-if="uploadScreenshotPreview"
                            class="flex justify-between items-center border rounded-lg p-1">
                            <div class="border p-1 rounded-lg">
                              <img @click.stop="onPickFile('uploadScreenshot')"
                                class="h-16 object-contain cursor-pointer" :src="uploadScreenshotPreview">
                            </div>
                            <div @click.stop="cancelUploadedScreenshot"
                              class="cursor-pointer h-6 w-6 border border-red-600 rounded-full flex flex-col items-center justify-center group">
                              <icon-close
                                class="h-4 w-4 text-red-600 group-hover:text-white group-hover:bg-red-600 rounded-full"></icon-close>
                            </div>
                          </div>
                          <div v-else @click.stop="onPickFile('uploadScreenshot')"
                            class="h-8 bg-blue-50 text-blue-600 text-xs text-center rounded-lg cursor-pointer flex justify-center items-center">
                            Upload Payment Receipt</div>
                        </div>
                        <p v-if="!uploadScreenshot.isValid" class="text-xxs text-blue-600 text-center">{{
                          uploadScreenshot.msg }}</p>
                        <div class="flex justify-center mt-2">
                          <div @click.stop="submitUploadScreenshot"
                            class="h-8 flex items-center justify-center border px-4 bg-blue-600 hover:bg-white text-white hover:text-blue-600 border-blue-600 rounded-lg cursor-pointer">
                            Submit
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>
                  <div v-else-if="selectedButton == 'copy'">
                    <div
                      class="flex justify-center items-center flex-wrap mt-2 bg-wizpay-gray px-2 py-1 rounded-lg h-8">
                      <div class="block text-wizpay-red text-xs uppercase font-medium">UPI ID</div>
                      <div class="flex justify-start items-center flex-wrap ml-2">
                        <div class="text-wizpay-red text-xs font-bold">{{ validatorUPIID }}</div>
                        <div class="ml-2">
                          <svg v-if="isUpiIdCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="currentColor" class="w-4 h-4 cursor-pointer text-wizpay-red">
                            <title>Copied</title>
                            <path fill-rule="evenodd"
                              d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                              clip-rule="evenodd" />
                            <path
                              d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                            <path
                              d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                          </svg>
                          <svg v-else @click.stop="copyToClipBoardUpiId" xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                            class="w-4 h-4 cursor-pointer text-wizpay-red">
                            <title>Copy to clipboard</title>
                            <path stroke-linecap="round" stroke-linejoin="round"
                              d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div class="mt-2">
                      <div v-if="is_utr_enabled_submitted" class="flex justify-center items-center h-8">
                        <p class="text-center text-xs text-green-600">
                          UTR Submitted Successfully!
                        </p>
                      </div>
                      <div v-else class="flex flex-col">
                        <div class="flex-grow">
                          <input type="text" class="h-8 bg-wizpay-gray text-xs text-center" placeholder="Enter UTR"
                            v-model="customerUtr.val" @blur="clearValidity('customerUtr')" />
                        </div>
                        <p v-if="!customerUtr.isValid" class="text-xxs text-red-600 text-center">{{ customerUtr.msg }}
                        </p>
                        <div class="flex justify-center mt-2">
                          <div @click.stop="addCustomerUtr"
                            class="h-8 flex items-center justify-center border px-4 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer">
                            Submit
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    No payment option selected!
                  </div>
                </div>
              </div>




            </div>
            <!-- Amount greater than 2000 end -->

            <div v-if="is_utr_enabled || showUtr">
              <div v-if="is_utr_enabled_submitted" style="height: 42px;" class="mt-4 flex justify-center items-center">
                <p class="text-center text-xs text-green-600">
                  UTR Submitted Successfully!
                </p>
              </div>
              <div v-else class="mt-4 flex flex-col">

                <div v-if="isShowAccountDetails" class="flex flex-col mb-4">
                  <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
                    <div class="block text-gray-800 text-lg font-medium">Account Holder Name</div>
                    <div class="flex justify-start items-center flex-wrap">
                      <div class="text-gray-700 text-lg font-bold">{{ accountHolderName }}</div>
                      <div class="ml-4">
                        <svg v-if="isAccountHolderNameCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          fill="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copied</title>
                          <path fill-rule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clip-rule="evenodd" />
                          <path
                            d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                          <path
                            d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                        </svg>
                        <svg v-else @click.stop="copyToClipBoardAccountHolderName" xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                          class="w-5 h-5 cursor-pointer">
                          <title>Copy to clipboard</title>
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
                    <div class="block text-gray-800 text-lg font-medium">Account Number</div>
                    <div class="flex justify-start items-center flex-wrap">
                      <div class="text-gray-700 text-lg font-bold">{{ accountNumber }}</div>
                      <div class="ml-4">
                        <svg v-if="isAccountNumberCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          fill="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copied</title>
                          <path fill-rule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clip-rule="evenodd" />
                          <path
                            d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                          <path
                            d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                        </svg>
                        <svg v-else @click.stop="copyToClipBoardAccountNumber" xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                          class="w-5 h-5 cursor-pointer">
                          <title>Copy to clipboard</title>
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
                    <div class="block text-gray-800 text-lg font-medium">IFSC</div>
                    <div class="flex justify-start items-center flex-wrap">
                      <div class="text-gray-700 text-lg font-bold">{{ ifsc }}</div>
                      <div class="ml-4">
                        <svg v-if="isIfscCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          fill="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copied</title>
                          <path fill-rule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clip-rule="evenodd" />
                          <path
                            d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                          <path
                            d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                        </svg>
                        <svg v-else @click.stop="copyToClipBoardIfsc" xmlns="http://www.w3.org/2000/svg" fill="none"
                          viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copy to clipboard</title>
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
                    <div class="block text-gray-800 text-lg font-medium">Bank Name</div>
                    <div class="flex justify-start items-center flex-wrap">
                      <div class="text-gray-700 text-lg font-bold">{{ bankName }}</div>
                      <div class="ml-4">
                        <svg v-if="isBankNameCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          fill="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copied</title>
                          <path fill-rule="evenodd"
                            d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                            clip-rule="evenodd" />
                          <path
                            d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                          <path
                            d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                        </svg>
                        <svg v-else @click.stop="copyToClipBoardBankName" xmlns="http://www.w3.org/2000/svg" fill="none"
                          viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                          <title>Copy to clipboard</title>
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- <div v-if="!isHighAmount" class="flex flex-col">
                  <div class="text-xs text-wizpay-red">Enter your UTR number</div>
                  <div class="w-full flex justify-between items-center mt-1">
                    <div class="flex-grow mr-1">
                      <input type="text" class="ht-34 bg-wizpay-gray" placeholder="Enter UTR" v-model="customerUtr.val"
                        @blur="clearValidity('customerUtr')" />
                    </div>
                    <div @click.stop="addCustomerUtr"
                      class="flex-shrink-0 border px-4 py-1 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer">
                      Submit
                    </div>
                  </div>
                  <p v-if="!customerUtr.isValid" class="text-xs text-red-600 text-left">
                    {{ customerUtr.msg }}
                  </p>
                </div> -->

              </div>
            </div>
            <!-- <div class="mt-4 flex justify-center">
              <div
                @click.stop="copyToClipBoard"
                class="cursor-pointer bg-wizpay-red rounded-lg px-4 py-2 text-white uppercase"
              >
                Copy to clipboard
              </div>
            </div> -->
            <div v-if="showAppButtons" class="mt-4 font-bold text-red-600 text-sm">
              Click UPI to pay using other apps and enter UTR
            </div>
          </div>
          <div v-if="paymentMethod === 'Automatic Payment'" class="w-full flex flex-col">
            <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
              <div class="text-gray-700 text-lg font-bold">Auto Approval Link</div>
              <div class="ml-4">
                <svg v-if="isAutoApprovallinkCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  fill="currentColor" class="w-5 h-5 cursor-pointer">
                  <title>Copied</title>
                  <path fill-rule="evenodd"
                    d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                    clip-rule="evenodd" />
                  <path
                    d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                  <path
                    d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                </svg>
                <svg v-else @click.stop="copyToClipBoardAutoApprovallink" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                  <title>Copy to clipboard</title>
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                </svg>
              </div>
            </div>
            <div class="flex justify-center mt-4">
              <a :href="autoApprovallink" target="_blank"
                class="flex-shrink-0 border px-4 py-2 bg-green-600 hover:bg-white text-white hover:text-green-600 border-green-600 rounded-md cursor-pointer">OPEN</a>
            </div>
          </div>
          <div v-if="paymentMethod === 'Manual Bank'" class="flex flex-col">
            <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
              <div class="block text-gray-800 text-lg font-medium">Account Holder Name</div>
              <div class="flex justify-start items-center flex-wrap">
                <div class="text-gray-700 text-lg font-bold">{{ accountHolderName }}</div>
                <div class="ml-4">
                  <svg v-if="isAccountHolderNameCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copied</title>
                    <path fill-rule="evenodd"
                      d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                      clip-rule="evenodd" />
                    <path
                      d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    <path
                      d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                  </svg>
                  <svg v-else @click.stop="copyToClipBoardAccountHolderName" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                    class="w-5 h-5 cursor-pointer">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
              <div class="block text-gray-800 text-lg font-medium">Account Number</div>
              <div class="flex justify-start items-center flex-wrap">
                <div class="text-gray-700 text-lg font-bold">{{ accountNumber }}</div>
                <div class="ml-4">
                  <svg v-if="isAccountNumberCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copied</title>
                    <path fill-rule="evenodd"
                      d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                      clip-rule="evenodd" />
                    <path
                      d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    <path
                      d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                  </svg>
                  <svg v-else @click.stop="copyToClipBoardAccountNumber" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
              <div class="block text-gray-800 text-lg font-medium">IFSC</div>
              <div class="flex justify-start items-center flex-wrap">
                <div class="text-gray-700 text-lg font-bold">{{ ifsc }}</div>
                <div class="ml-4">
                  <svg v-if="isIfscCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                    class="w-5 h-5 cursor-pointer">
                    <title>Copied</title>
                    <path fill-rule="evenodd"
                      d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                      clip-rule="evenodd" />
                    <path
                      d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    <path
                      d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                  </svg>
                  <svg v-else @click.stop="copyToClipBoardIfsc" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center flex-wrap mt-4 bg-wizpay-gray px-2 py-1 rounded-lg">
              <div class="block text-gray-800 text-lg font-medium">Bank Name</div>
              <div class="flex justify-start items-center flex-wrap">
                <div class="text-gray-700 text-lg font-bold">{{ bankName }}</div>
                <div class="ml-4">
                  <svg v-if="isBankNameCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copied</title>
                    <path fill-rule="evenodd"
                      d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                      clip-rule="evenodd" />
                    <path
                      d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    <path
                      d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                  </svg>
                  <svg v-else @click.stop="copyToClipBoardBankName" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
            </div>
            <div v-if="is_utr_enabled_submitted" class="mt-4 flex justify-center items-center ht-34">
              <p class="text-center text-xs text-green-600">
                UTR Submitted Successfully!
              </p>
            </div>
            <div v-else class="mt-4 flex flex-col">
              <div class="text-xs text-wizpay-red">Enter your UTR number</div>
              <div class="w-full flex justify-between items-center mt-1">
                <div class="flex-grow mr-1">
                  <input type="text" class="ht-34 bg-wizpay-gray" placeholder="Enter UTR" v-model="customerUtr.val"
                    @blur="clearValidity('customerUtr')" />
                </div>
                <div @click.stop="addCustomerUtr"
                  class="flex-shrink-0 border px-4 py-1 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer">
                  Submit</div>
              </div>
              <p v-if="!customerUtr.isValid" class="text-xs text-red-600 text-left">
                {{ customerUtr.msg }}
              </p>
            </div>
          </div>
        </div>
        <div v-if="showAppButtons" class="flex bg-gray-100 rounded-b-lg p-4">
          <div
            v-if="paymentMethod === 'UPI' || paymentMethod === 'automatic_payment_with_sms' || paymentMethod === 'automatic_payment_with_extension' || paymentMethod === 'chrome_extension_with_decimal'"
            class="grid grid-cols-4 gap-4 items-center">
            <div class="shadow-lg rounded-lg border-2 p-2 h-10 flex flex-col items-center justify-center">
              <a @click.stop="setCustomerPaymentType('paytm')" target="_blank" :href="paytmLink">
                <img class="h-6 object-contain" src="../../assets/images/paytm1.png" alt="upi" />
              </a>
            </div>
            <div class="shadow-lg rounded-lg border-2 p-2 h-10 flex flex-col items-center justify-center">
              <a @click.stop="setCustomerPaymentType('gpay')" target="_blank" :href="gpayLink">
                <img class="h-6 object-contain" src="../../assets/images/gpay2.png" alt="gpay" />
              </a>
            </div>
            <div class="shadow-lg rounded-lg border-2 p-2 h-10 flex flex-col items-center justify-center">
              <a @click.stop="setCustomerPaymentType('phonepe')" target="_blank" :href="phonepeLink">
                <img class="h-6 object-contain" src="../../assets/images/phonepe1.png" alt="phonepe" />
              </a>
            </div>
            <div @click.stop="upiClicked"
              class="shadow-lg rounded-lg border-2 p-2 h-10 flex flex-col items-center justify-center cursor-pointer">
              <img class="h-6 object-contain" src="../../assets/images/upi1.png" alt="upi" />
            </div>
          </div>
          <div v-if="paymentMethod === 'Automatic Payment'" class="flex justify-center">
            <p class="text-sm text-center font-bold">Automatic Payment Text</p>
          </div>
          <div v-if="paymentMethod === 'Manual Bank'" class="flex justify-center">
            <p class="text-sm text-center font-bold">Please make a payment to the above account details to complete your
              transaction and enter the UTR</p>
          </div>
        </div>

        <div class="w-full flex justify-center flex-wrap mt-6">
          <div class="mr-2">
            <icon-norton></icon-norton>
          </div>
          <div class="ml-2">
            <icon-psi></icon-psi>
          </div>
        </div>
        <div class="text-xs text-center -mt-2">100% Secure Payments</div>


        <!-- <div @click.stop="unableToPay" class="bg-red-600 text-white text-center p-4 rounded-b-lg font-bold cursor-pointer">Click Here if unable to pay</div> -->
      </div>
      <base-card key="2" v-else>
        <form @submit.prevent="submitForm" class="w-100-per sm:w-400 p-4">
          <div class="flex justify-center">
            <img class="h-20" src="../../assets/images/logo.jpg" />
          </div>
          <div class="mt-4" :class="{ invalid: !customerUpiId.isValid }">
            <label class="text-sm text-center" for="customerUpiId">Please Enter Your Correct UPI ID</label>
            <input type="text" id="customerUpiId" v-model.trim="customerUpiId.val"
              @blur="clearValidity('customerUpiId')" />
          </div>
          <p v-if="!formIsValid" class="text-xs text-red-600">
            {{ customerUpiId.msg }}
          </p>
          <div class="flex justify-center mt-4">
            <base-button>Next</base-button>
          </div>
        </form>
      </base-card>
    </transition>

    <div class="success-message fixed z-50 text-white rounded-lg p-2 bg-green-500" v-if="isVisible">
      <div class="flex items-center">
        <span class="icon mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </span>
        <span class="text">{{ message }}</span>
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <base-full-modal v-if="showTicketForm" :title="`Create Ticket`" @close="closeFullModal">
        <create-ticket class="text-left p-8" :vendor="vendorName" @created="onTicketCreated" @failed="onTicketFailed"
          @close="closeFullModal"></create-ticket>
      </base-full-modal>
    </transition>

    

    <div class="h-full flex justify-center items-center" v-if="isLoading">
      <base-page-spinner-new type="spin" class-list="h-20"></base-page-spinner-new>
    </div>

  </section>
</template>
<script>
import VueCountdown from "@chenfengyuan/vue-countdown";
import http from "../../http-common.js";
import VueQRCodeComponent from "vue-qrcode-component";
import ChatWindow from '../../components/chat/ChatWindow.vue';
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import io from "socket.io-client";
import CreateTicket from "./create-ticket.vue";
import IconNorton from "../../components/icons/IconNorton.vue";
import IconPsi from "../../components/icons/IconPsi.vue";
import IconClose from "../../components/icons/IconClose.vue";
export default {
  name: "pay",
  props: ["id"],
  components: {
    ChatWindow,
    VueCountdown,
    "qr-code": VueQRCodeComponent,
    CreateTicket,
    IconNorton,
    IconPsi,
    IconClose,
  },
  data() {
    return {
      orderId: null,
      userId: 'user_' + Math.random().toString(36).substr(2, 9), // Generate a unique user ID
      initialMessages: [],
      isEndToPay: false,
      isPaymentSuccessful: false,
      customerUpiId: {
        val: "",
        isValid: true,
        msg: "",
      },
      formIsValid: true,
      isUpiIdSubmitted: false,
      countDownLimit: 1000 * 60 * 60, // 60 minutes
      expiresAt: null,
      intervalId: null,
      confettiActive: true,
      qrCodeText: "",
      error: null,
      showForm: false,
      amount: null,
      txnFee: null,
      diffAmount: null,
      receiptId: null,
      returnUrl: null,
      isVisible: false,
      message: "Payment received successfully!",
      validatorUPIID: "",
      gpayLink: "",
      paytmLink: "",
      phonepeLink: "",
      showTransactionBar: false,
      socket: null,
      is_utr_enabled: false,
      isPayNow: false,
      customerUtr: {
        val: "",
        isValid: true,
        msg: "",
      },
      is_utr_enabled_submitted: false,
      vendorName: "",
      showUtr: false,
      paymentMethod: "UPI",
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
      bankName: "",
      statiqQr: "",
      isAccountHolderNameCopied: false,
      isAccountNumberCopied: false,
      isIfscCopied: false,
      isBankNameCopied: false,
      showTicketForm: false,
      autoApprovallink: "",
      isAutoApprovallinkCopied: false,
      showAppButtons: false,
      showDownloadBtn: false,
      showQr: true,
      isHighAmount: false,
      isUpiIdCopied: false,
      showVideoModal: false,
      videoModalTitle: "",
      videoModalUrl: "",
      selectedButton: "",
      chatUnreadCount: 0,
      uploadScreenshot: {
        val: null,
        isValid: true,
        msg: "",
      },
      uploadScreenshotPreview: null,
      isUploadStatementSubmitted: false,
      uploadScreenshotStatus: null,
      uploadScreenshotMsg: "",
      isLoading: false,
    };
  },
  watch: {
    isAutoApprovallinkCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isAutoApprovallinkCopied = false;
        }, 200)
      }
    },
    isUpiIdCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isUpiIdCopied = false;
        }, 200)
      }
    },
    isAccountHolderNameCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isAccountHolderNameCopied = false;
        }, 200)
      }
    },
    isAccountNumberCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isAccountNumberCopied = false;
        }, 200)
      }
    },
    isIfscCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isIfscCopied = false;
        }, 200)
      }
    },
    isBankNameCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isBankNameCopied = false;
        }, 200)
      }
    },
    amount(newVal) {
      if (newVal > 2000) {
        this.isHighAmount = true;
        this.showQr = false;
        this.countDownLimit = 1000 * 60 * 60; // 60 minutes
      }
    },
  },
  computed: {
    isShowAccountDetails() {
      if (this.accountNumber && this.ifsc && this.bankName) {
        return true;
      } else {
        return false;
      }
    },
    getQrCodeSize() {
      if (window.innerWidth > 639) {
        return 256;
      } else {
        return 128;
      }
    },
  },
  created() {
    this.skipUpdateCustomerUpiId();
    this.calculateTimerFromDatabase();
    this.socket = io(process.env.VUE_APP_SOCKET_URL, {
      path: "/wizpay-socket-path",
    });

    // Set orderId from route params if available (router path: /pay/:id)
    if (this.$route.params && this.$route.params.id) {
      this.orderId = this.$route.params.id;
      this.loadChatHistory();
    } else if (this.id) {
      // Fallback: use prop if provided by router props
      this.orderId = this.id;
      this.loadChatHistory();
    }

    // Handle events
    this.socket.on("connect", () => {
      console.log("Connected to server");
      if (this.orderId) {
        this.socket.emit('join-payin-room', { refID: this.orderId });
        this.socket.emit('chat:join', { refID: this.orderId });
        // Notify withdrawal page that payee has connected
        this.socket.emit('payee-connected', { 
          refID: this.orderId, 
          userType: 'payer',
          timestamp: Date.now()
        });
        console.log(`[PayPage] Notified withdrawal page of payee connection for order ${this.orderId}`);
      }
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Listen for chat messages (server emits 'chat:message')
    this.socket.on('chat:message', (payload) => {
      if (payload.refID === this.orderId) {
        this.initialMessages.push({
          ...payload,
          sender: payload.senderType === 'payer' ? 'user' : 'other'
        });
      }
    });

    this.checkTheOrderExist();
  },
  methods: {
    openChatPanel() {
      if (this.$refs.chatWindow && this.$refs.chatWindow.openChat) {
        this.$refs.chatWindow.openChat();
      }
    },
    onChatUnreadCountChanged(count) {
      this.chatUnreadCount = count;
      console.log(`[Pay Page] Chat unread count changed to: ${count}`);
    },
    // Load chat history when order is loaded
    async loadChatHistory() {
      if (!this.orderId) return;
      
      try {
        const response = await http.get(`/orders/${this.orderId}/chat-public`);
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        this.initialMessages = rows.map(msg => ({
          text: msg.message,
          timestamp: msg.created_at,
          sender: (msg.sender_type === 'payer') ? 'user' : 'other'
        }));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    },
    onPickFile(ref) {
      this.$refs[ref].click();
    },
    handleUploadScreenshot(event) {
      this.uploadScreenshot.isValid = true;
      this.uploadScreenshot.msg = "";
      const file = event.target.files[0];
      if (file) {
        if (!file.type.includes('image/')) {
          this.uploadScreenshot.isValid = false;
          this.uploadScreenshot.msg = 'Only JPG, JPEG and PNG files are allowed.';
        } else if (file.size > 2 * 1024 * 1024) {
          this.uploadScreenshot.isValid = false;
          this.uploadScreenshot.msg = 'File size must be less than 2MB.';
        } else {
          this.uploadScreenshot.isValid = true;
          this.uploadScreenshot.msg = '';
          this.uploadScreenshot.val = file;
          this.uploadScreenshotPreview = URL.createObjectURL(file);
        }
      }
    },
    cancelUploadedScreenshot() {
      this.uploadScreenshot.val = null;
      this.uploadScreenshotPreview = null;
      this.$refs.uploadScreenshot.value = null;
    },
    async submitUploadScreenshot() {
      let formIsValid = true;
      if (this.uploadScreenshot.val === null) {
        this.uploadScreenshot.isValid = false;
        this.uploadScreenshot.msg = this.uploadScreenshot.msg || "You must upload a screenshot.";
        formIsValid = false;
      }

      if (!formIsValid) {
        return;
      }

      const formData = new FormData();
      formData.append('upload_screenshot', this.uploadScreenshot.val);

      this.isLoading = true;

      try {
        const response = await http.post(`orders/${this.id}/upload-screenshot`, formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        if (response.status == 201) {
          this.isUploadStatementSubmitted = true;
          this.uploadScreenshotStatus = response.data.status;
          this.uploadScreenshotMsg = response.data.message;
        } else {
          alert('failed', 'Failed to create the ticket. Please try again!');
        }
      } catch (error) {
        console.log(error);
      }

      this.isLoading = false;

    },
    selectButton(btnName) {
      this.selectedButton = btnName;
    },
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;
      if (this.customerUpiId.val === "") {
        this.customerUpiId.isValid = false;
        this.customerUpiId.msg = "You must enter UPI ID.";
        this.formIsValid = false;
      } else {
        const isValidUpiId = /^[\w.-]+@[\w.-]+$/.test(this.customerUpiId.val);
        if (!isValidUpiId) {
          this.customerUpiId.isValid = false;
          this.customerUpiId.msg = "Please enter a valid UPI ID.";
          this.formIsValid = false;
        }
      }
    },
    async skipUpdateCustomerUpiId() {
      try {
        const response = await http.post(`/orders/${this.id}/customerUpiId`, {
          customerUPIID: this.customerUpiId.val,
        });
        if (response.status == 201) {
          this.generateUpiQrCodeString(response.data.data);
          this.isUpiIdSubmitted = true;
        } else {
          alert("error");
        }
      } catch (error) {
        console.log(error);
      }
    },
    async submitForm() {
      this.validateForm();
      if (!this.formIsValid) {
        return;
      }

      try {
        const response = await http.post(`/orders/${this.id}/customerUpiId`, {
          customerUPIID: this.customerUpiId.val,
        });
        if (response.status == 201) {
          this.generateUpiQrCodeString(response.data.data);
          this.isUpiIdSubmitted = true;
        } else {
          alert("error");
        }
      } catch (error) {
        console.log(error);
      }
    },
    countDownStarted() {
      this.socket.on(`${this.vendorName}-order-approved-${this.id}`, (data) => {
        this.checkOrderStatus(data);
      });
      // Set interval to call the API every 30 seconds
      this.intervalId = setInterval(() => {
        this.checkPaymentStatus();
      }, 15000);
    },
    async countDownEnd() {
      if (this.socket) {
        this.socket.disconnect();
      }
      const isUpdated = await this.updateOrderStatus();
      if (isUpdated) {
        if (this.returnUrl) {
          window.location.href = this.returnUrl;
        } else {
          if (this.isPaymentSuccessful) {
            this.$router.replace("/success");
          } else {
            this.$router.replace("/pending");
          }
        }
      }
    },
    async updateOrderStatus() {
      try {
        const response = await http.post(`/orders/${this.id}/updateOrderStatus`);
        if (response.status == 201) {
          return true;
        } else {
          return true;
        }
      } catch (error) {
        return true;
      }
    },
    checkAutoOrderStatus(approvedData) {
      if (
        approvedData.refID == this.id &&
        approvedData.paymentStatus == "approved"
      ) {
        this.showTransactionBar = false;
        this.countDownLimit = 0;
        this.$confetti.start();
        this.showMessage();
        setTimeout(() => {
          this.$confetti.stop();
          this.amount = null;
          this.receiptId = null;
          this.validatorUPIID = "";
          if (this.returnUrl) {
            window.location.href = this.returnUrl;
          } else {
            this.$router.replace("/success");
          }
        }, 3000);
      } else {
        alert('Your Payment Failed');
        if (this.returnUrl) {
          window.location.href = this.returnUrl;
        } else {
          this.$router.replace("/failed");
        }
      }
    },
    checkOrderStatus(approvedData) {
      if (
        approvedData.refID == this.id &&
        approvedData.paymentStatus == "approved"
      ) {
        this.showTransactionBar = false;
        this.countDownLimit = 0;
        this.$confetti.start();
        this.showMessage();
        setTimeout(() => {
          this.$confetti.stop();
          this.amount = null;
          this.receiptId = null;
          this.validatorUPIID = "";
          if (this.returnUrl) {
            window.location.href = this.returnUrl;
          } else {
            this.$router.replace("/success");
          }
        }, 3000);
      }
    },
    generateUpiQrCodeString(data) {
      // Try multiple possible keys from API payloads
      this.validatorUPIID =
        data.payeeUPIID ||
        data.validatorUPIID ||
        data.validatorUpiId ||
        data.validator_upi_id ||
        data.customerUPIID ||
        data.customerUpiId ||
        data.customer_upi_id ||
        data.upi || data.upiId || data.upiID ||
        data.customerUPIID ||
        data.customerUpiId ||
        data.customer_upi_id ||
        '';
      const paying = data.clientName;
      this.amount = data.amount;
      this.txnFee = data.txnFee;
      this.diffAmount = data.diffAmount;
      this.receiptId = data.receiptId;
      this.returnUrl = data.returnUrl;
      localStorage.setItem("orderCreatedBy", data.created_by);
      localStorage.setItem("orderReceiptId", data.receiptId);
      // Prefer QR text from API if provided (various keys), then extract UPI ID (pa=)
      const apiQrText =
        data.qrCodeText ||
        data.qrText ||
        data.qr_code_text ||
        data.qrCode ||
        data.qr ||
        '';
      this.qrCodeText = apiQrText || `upi://pay?pa=${this.validatorUPIID}&pn=${paying}&tr=${this.receiptId}&tn=${this.receiptId}&am=${this.amount}&cu=INR`;
      // Extract UPI ID (pa=) from QR text if not present yet
      if (!this.validatorUPIID && this.qrCodeText) {
        try {
          const q = this.qrCodeText.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const pa = params.get('pa');
          if (pa) this.validatorUPIID = pa;
        } catch (e) {
          // Fallback parse failed; keep validatorUPIID as-is
          void 0;
        }
      }
      this.gpayLink = `gpay://upi/pay?pa=${this.validatorUPIID}&pn=${paying}&tr=${this.receiptId}&tn=${this.receiptId}&am=${this.amount}&cu=INR`;
      this.paytmLink = `paytmmp://pay?pa=${this.validatorUPIID}&pn=${paying}&tr=${this.receiptId}&tn=${this.receiptId}&am=${this.amount}&cu=INR`;
      this.phonepeLink = `phonepe://pay?pa=${this.validatorUPIID}&pn=${paying}&tr=${this.receiptId}&tn=${this.receiptId}&am=${this.amount}&cu=INR`;
    },
    downloadQrCode() {
      // Use html2canvas to capture a screenshot of the QR code element
      html2canvas(this.$refs.qrCode.$el).then((canvas) => {
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL("image/png");

        // Use FileSaver.js to save the file
        saveAs(imageDataUrl, "qr-code.png");
      });
    },
    async checkTheOrderExist() {
      let url = `/orders/${this.id}`;
      const data = { apiType: "payment" };
      try {
        const response = await http.get(url, { params: data });
        if (response.status == 200) {
      this.isEndToPay = response.data.is_end_to_end;
      this.is_utr_enabled = response.data.is_utr_enabled;
      this.isPayNow = response.data.isPayNow;
      this.showForm = true;
      this.vendorName = response.data.vendor;
      this.paymentMethod = response.data.paymentMethod;
      // Build QR using server-sent identifiers (payeeUPIID/clientName/receiptId)
      this.generateUpiQrCodeString(response.data);
      if (this.paymentMethod === "Manual Bank") {
        this.socket.on(`${this.vendorName}-order-approved-${this.id}`, (data) => {
          this.checkOrderStatus(data);
        });
      } else if (this.paymentMethod === "Automatic Payment") {

            if (response.data.paymentStatus != 'pending') {
              this.checkAutoOrderStatus(
                {
                  refID: this.id,
                  paymentStatus: response.data.paymentStatus,
                }
              );
            } else {
              this.socket.on(`auto-order-approved-${this.id}`, (data) => {
                this.checkAutoOrderStatus(data);
              });

              const refId = response.data.refID;
              const token = response.data.token;
              const amount = response.data.amount;
              const merchantCode = response.data.merchantCode;
              const merchantName = response.data.merchantName;
              const receiptId = response.data.receiptId;
              const upi = this.validatorUPIID;
              const url = `https://zinggale.com?refId=${refId}&upi=${upi}&amount=${amount}&receiptId=${receiptId}&merchantCode=${merchantCode}&merchantName=${merchantName}&token=${token}`;
              const encodedUrl = encodeURIComponent(url);
              const redirectUrl = `https://zinggale.page.link/?link=${encodedUrl}&apn=com.zinggale.upipayment&efr=1`;
              // this.showTransactionBar = true;
              // window.location.href = redirectUrl;
              // window.open(redirectUrl, '_blank');
              this.autoApprovallink = redirectUrl;
            }
          }
          this.accountHolderName = response.data.accountHolderName;
          this.accountNumber = response.data.accountNumber;
          this.ifsc = response.data.ifsc;
          this.bankName = response.data.bankName;
          this.statiqQr = response.data.qr;
        }
      } catch (error) {
        if (error.response.status == 406) {
          this.error =
            "Transaction can not be processed at this time. Assigned user is not logged in or inactive.";
        } else {
          this.error = error.response.data.message || "Something failed!";
          this.returnUrl = error.response.data.returnUrl || "";
        }
      }
    },
    showMessage() {
      this.isVisible = true;
      setTimeout(() => {
        this.isVisible = false;
      }, 3000);
    },
    copyToClipBoardAutoApprovallink() {
      navigator.clipboard.writeText(this.autoApprovallink);
      this.isAutoApprovallinkCopied = true;
    },
    copyToClipBoardUpiId() {
      navigator.clipboard.writeText(this.validatorUPIID);
      this.isUpiIdCopied = true;
    },
    copyToClipBoardAccountHolderName() {
      navigator.clipboard.writeText(this.accountHolderName);
      this.isAccountHolderNameCopied = true;
    },
    copyToClipBoardAccountNumber() {
      navigator.clipboard.writeText(this.accountNumber);
      this.isAccountNumberCopied = true;
    },
    copyToClipBoardIfsc() {
      navigator.clipboard.writeText(this.ifsc);
      this.isIfscCopied = true;
    },
    copyToClipBoardBankName() {
      navigator.clipboard.writeText(this.bankName);
      this.isBankNameCopied = true;
    },
    async copyToClipBoard() {
      navigator.clipboard.writeText(this.validatorUPIID);
      await this.setCustomerPaymentType("copy_to_clipboard");
    },
    onCountdownProgress(event) {
      if (event.minutes == 0 && event.seconds >= 30) {
        // this.showTransactionBar = true;
      }
    },
    closeTheDialogBox() {
      this.error = null;
      if (this.returnUrl) {
        window.location.href = this.returnUrl;
      } else {
        this.$router.replace("/success");
      }
    },
    async setCustomerPaymentType(customerPaymentType) {
      try {
        const response = await http.post(
          `/orders/${this.id}/setCustomerPaymentType`,
          {
            customerPaymentType: customerPaymentType,
          }
        );
        if (response.status == 201) {
          console.log(response);
        } else {
          console.log(response);
        }
      } catch (error) {
        console.log(error);
      }
    },
    async checkPaymentStatus() {
      let url = `/orders/${this.id}`;
      try {
        const response = await http.get(url);
        if (response.status == 200) {
          if (response.data.paymentStatus == "approved") {
            this.isPaymentSuccessful = true;
            this.showTransactionBar = false;
            this.countDownLimit = 0;
            this.$confetti.start();
            this.showMessage();
            setTimeout(() => {
              this.$confetti.stop();
              this.amount = null;
              this.receiptId = null;
              this.validatorUPIID = "";
            }, 3000);
            clearInterval(this.intervalId);
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    async addCustomerUtr() {
      if (this.customerUtr.val == "") {
        this.customerUtr.msg = "You must enter UTR";
        this.customerUtr.isValid = false;
      } else {
        try {
          this.isLoading = true;
          const response = await http.post(
            `/orders/${this.id}/addCustomerUtr`,
            {
              customerUtr: this.customerUtr.val,
            }
          );
          if (response.status == 201) {
            if (response.data.status) {
              this.is_utr_enabled_submitted = true;
              if (this.paymentMethod === 'Manual Bank') {
                this.intervalId = setInterval(() => {
                  this.checkPaymentStatus();
                }, 5000);
                this.showTransactionBar = true;
              }
            } else {
              this.error = response.data.message;
            }
          } else {
            console.log(response);
          }
          this.isLoading = false;
        } catch (error) {
          this.isLoading = false;
        }
      }
    },
    upiClicked() {
      if (!this.showUtr) {
        this.showUtr = true;
        this.countDownLimit = 1000 * 60 * 60; // 60 minutes
      }
    },
    openTicketForm() {
      this.showTicketForm = true;
    },
    closeFullModal() {
      this.showTicketForm = false;
    },
    onTicketCreated() {
      this.$swal.fire(
        "Success!",
        "Your ticket has been successfully submitted. Our team will review it shortly.",
        "success"
      ).then((result) => {
        if (result.value || result.dismiss) {
          this.showTicketForm = false;
          if (this.returnUrl) {
            window.location.href = this.returnUrl;
          } else {
            this.$router.replace("/success");
          }
        }
      })
    },
    onTicketFailed(msg) {
      this.$swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: msg,
      }).then((result) => {
        if (result.value || result.dismiss) {
          this.showTicketForm = false;
          if (this.returnUrl) {
            window.location.href = this.returnUrl;
          } else {
            this.$router.replace("/success");
          }
        }
      })
    },
    async unableToPay() {
      try {
        const response = await http.post(`/orders/${this.id}/unableToPay`);
        if (response.status == 200) {
          this.$swal.fire(
            "Please try again!",
            "We apologize for any inconvenience caused.",
            "success"
          ).then((result) => {
            if (result.value || result.dismiss) {
              if (this.returnUrl) {
                window.location.href = this.returnUrl;
              } else {
                this.$router.replace("/success");
              }
            }
          })
        } else {
          this.$swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: "Please try again. Something went wrong!",
          }).then((result) => {
            if (result.value || result.dismiss) {
              if (this.returnUrl) {
                window.location.href = this.returnUrl;
              } else {
                this.$router.replace("/success");
              }
            }
          })
        }
      } catch (error) {
        this.$swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error,
        }).then((result) => {
          if (result.value || result.dismiss) {
            if (this.returnUrl) {
              window.location.href = this.returnUrl;
            } else {
              this.$router.replace("/success");
            }
          }
        })
      }
    },
    openVideoModal(lang) {
      if (lang == 'hindi') {
        this.videoModalTitle = "How to make a Payment (Hindi)";
        this.videoModalUrl = "https://www.youtube.com/embed/GNNrpXTPQ8U?si=vr6a5z1uvY-vQj0A&autoplay=1";
      } else if (lang == 'kannada') {
        this.videoModalTitle = "How to make a Payment (Kannada)";
        this.videoModalUrl = "https://www.youtube.com/embed/xecQlmHAzWc?si=cB4zUH6o8BosP3YF&autoplay=1";
      } else if (lang == 'telugu') {
        this.videoModalTitle = "How to make a Payment (Telugu)";
        this.videoModalUrl = "https://www.youtube.com/embed/XgDfe0c4P1Q?si=M-iIZ8WNX_-zuAvA&autoplay=1";
      } else if (lang == 'malayalam') {
        this.videoModalTitle = "How to make a Payment (Malayalam)";
        this.videoModalUrl = "https://www.youtube.com/embed/Z89NCFUmsSY?si=uML3EwH7oTc0USA0&autoplay=1";
      }
      this.showVideoModal = true;
    },
    closeVideoModal() {
      this.showVideoModal = false;
      this.videoModalTitle = "";
      this.videoModalUrl = "";
    },
    async calculateTimerFromDatabase() {
      try {
        const response = await http.get(`/orders/${this.id}`);
        if (response.data && response.data.expires_at) {
          this.expiresAt = new Date(response.data.expires_at).getTime();
          this.updateCountdownFromExpiry();
        } else {
          // If no expires_at, set 60 minutes from now
          this.expiresAt = Date.now() + (60 * 60 * 1000);
          this.updateCountdownFromExpiry();
        }
      } catch (error) {
        console.error('Error loading order expiry:', error);
        // Fallback to 60 minutes
        this.expiresAt = Date.now() + (60 * 60 * 1000);
        this.updateCountdownFromExpiry();
      }
    },
    updateCountdownFromExpiry() {
      if (this.expiresAt) {
        const now = Date.now();
        const remaining = this.expiresAt - now;
        this.countDownLimit = Math.max(0, remaining);
        console.log(`[PayPage] Timer updated from database: ${Math.floor(remaining / 1000)}s remaining`);
      }
    },
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    clearInterval(this.intervalId);
  },
};
</script>

<style lang="scss" scoped>
@responsive {
  .w-400 {
    width: 400px;
  }

  .w-100-per {
    width: 100%;
  }
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.slide-right-enter-active {
  transition: all 0.3s ease-out;
}

.slide-right-leave-active {
  transition: all 0.3s ease-in;
}

.slide-right-enter-to,
.slide-right-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.bg-timer {
  background-color: #D76565;
}

.success-message {
  background-color: #28a745;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.text-xxs {
  font-size: 10px;
}

.text-red-1 {
  color: #D76565;
}

.ht-34 {
  height: 34px;
}

/* Chat notification dot on icon */
.chat-notification-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 10;
  animation: pulse-chat-notification 1.5s infinite;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
}

@keyframes pulse-chat-notification {
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: scale(1.2);
    opacity: 0.9;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
  }
}
</style>
