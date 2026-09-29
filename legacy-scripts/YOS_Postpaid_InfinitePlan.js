const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');
// YOS-ASR-24
describe("Postpaid infinite pkan with contract IoT", () => {
  it("tests Postpaid infinite pkan with contract IoT", async () => {
    await browser.maximizeWindow()
    //await browser.url("https://yesmy-dev:YesMyDev123$@yesmy-dev.azurewebsites.net/devices")
    await browser.url(BUFFER.getItem('yos_IoT_url'))
    await browser.$("#tabNavContent > div:nth-of-type(1) > ul:nth-of-type(1) > li > a").click()
    await browser.$("div:nth-of-type(1) > ul:nth-of-type(1) > li > ul li:nth-of-type(1) > a").click()
    
    await Util.scrollIntoView("//a[@class='btn pink-btn btn-buynow']");
    await browser.$("//a[@class='btn pink-btn btn-buynow']").click()
  
    await browser.$("//*[@id='tabContent-bbContract-12 Months']").click()
    await Util.scrollIntoView('#input-name');
    await browser.$("#input-name").click()
    await browser.$("#input-name").setValue(BUFFER.getItem('cust_name'))
    await browser.$("#input-phone_new").click()
    await browser.$("#input-phone_new").setValue(BUFFER.getItem('alternative_num'))
    await browser.$("#input-email").click()
    await browser.$("#input-email").setValue(BUFFER.getItem('email'))
    await browser.$("//button[text()='ADD TO CART']").click()
  
  });
  
  it("payment validation", async () => {
    
    await browser.$("#select-security_type").click()
      const selectBox = await $('#select-security_type');
      await selectBox.selectByVisibleText('Passport');
      
    await browser.$("#input-security_id").click()
    await browser.$("#input-security_id").setValue(BUFFER.getItem('passport_num'))
    await browser.$("#gender").click()
    
    await browser.$("#gender").click()
      const selectBox1 = await $('#gender');
      await selectBox1.selectByVisibleText(BUFFER.getItem('cust_gender'));

    await browser.$("#input-dob").click()
    await browser.$("#input-dob").setValue(BUFFER.getItem('dob'))
    //await browser.keys('Enter')
    await browser.execute(() => {
      document.getElementById('input-subscribePlan').click()
    });
    await browser.execute(() => {
      document.getElementById('input-privacyPolicy').click()
    });
   // await browser.$("#input-privacyPolicy").click()
   // await browser.$("#input-subscribePlan").click()
    await browser.$("//button[text()='Next']").click()
    await browser.$("#input-address").click()
    await browser.$("#input-address").setValue("TEST ADDRESS")
    await browser.$("#input-unit_no").click()
    await browser.$("#input-unit_no").setValue("1")
    await browser.$("//input[@type = 'text' and @id='input-postcode']").click()
    await browser.$("//input[@type = 'text' and @id='input-postcode']").setValue("51200")
   /* await browser.$("#input-city").click()
    await Util.F.selectDropDownValue('#input-city', 'KUALA LUMPUR')*/
    await browser.$("//button[text()='Next']").click()
    await browser.pause(3000)
    
    await browser.$("//label[text()='Online Banking (FPX)']").click()
    
    await browser.$("#bb-select-bank").click()
      const selectBox2 = await $('#bb-select-bank');
      await selectBox2.selectByVisibleText('SBI Bank A')
   
    let parentWindow = await browser.getWindowHandle()
    await browser.$("//*[@id='page-main']/form/section[2]/div[1]/div/div/div/div[2]/div[3]/div[5]/button").click()
   
    let windows = await browser.getWindowHandles()
	
      for(let window of windows){
        if(parentWindow != window){
            await browser.switchToWindow(window)
            if(await (await browser.getTitle()).includes("FPX")){
                await browser.pause(5000)
      await browser.$("#userId").click()
      await browser.$("#userId").setValue("1234")
      await browser.$("#password").click()
      await browser.$("#password").setValue("1234")
      await browser.$("/html/body/div/div[2]/form/div/div[2]/button[1]").click()
      
      await browser.$("/html/body/div/div[2]/form/div/div[2]/select").click()
   
      await browser.$("/html/body/div/div[2]/form/div/div[2]/button[1]").click()
      await browser.pause(5000)
            }
        }
      }
      
      await browser.switchToWindow(parentWindow)
      await browser.pause(5000)
      
      const ele_successful = await $("//h2[text()='Thank you!']")
      await ele_successful.waitUntil(async function () {
        return (await this.getText()) === 'Thank you!'
    }, {
        timeout: 30000,
        timeoutMsg: 'payment is taking more than expected time'
    })
      
    await browser.$("//p[@class='panel-orderNumber']").getText();
    
  });
});

