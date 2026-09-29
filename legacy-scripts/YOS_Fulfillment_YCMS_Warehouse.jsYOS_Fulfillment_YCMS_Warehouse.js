
//YOS-ASR-25
const Util = require('../node_modules/froth-webdriverio-framework/froth_common_actions/Utils');
describe("YOS YCMS fulfillment warehouse", () => {
  it("tests YOS YCMS fulfillment warehouse", async () => {
    await browser.maximizeWindow()
    //await browser.url("https://ycmsiot.ytlcomms.my/ycms/login")
    
    await browser.url(BUFFER.getItem('ycms_IoT_url'))
    await browser.$("#username").click()
          
    await browser.$("#username").setValue(BUFFER.getItem('ycms_operator_userid'))
    //await browser.$("#username").setValue('ytldoperation')

    await browser.$("#password").click()
    await browser.$("#password").setValue(BUFFER.getItem('ycms_operator_password'))
    //await browser.$("#password").setValue('ytlc@xm1234')
    await browser.$("center > input").click()
    await browser.$("//a[text()='SCM']").click()
    await browser.$("//span [text() = 'Purchase Orders']").click()
    await browser.$("#searchStatus").click()
    const selectBox = await $('#searchStatus');
    await selectBox.selectByVisibleText('REQUESTER PO NO/STR NO'); 
    
    await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").click()
    await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").setValue(BUFFER.getItem('order_num'))
    //await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").setValue('Y5G2503282000033046')
     
    await browser.$("//button[text()='SEARCH']").click()
    await browser.$("//*[@id='results']/tbody/tr[2]/td[3]").click()
    
    await browser.$("//button[@name='btnCreateSo']").click()
    //await browser.pause(3000)
    await browser.acceptAlert();
    await browser.$("//a[text()='Log out'] ").click()
    
    await browser.url(BUFFER.getItem('ycms_IoT_url'))
    await browser.$("#username").click()
    await browser.$("#username").setValue(BUFFER.getItem('ycms_logistic_userid'))
    //await browser.$("#username").setValue('ytldlogistic')
    await browser.$("#password").click()
    await browser.$("#password").setValue(BUFFER.getItem('ycms_logistic_password'))
    //await browser.$("#password").setValue('ytlc@xm1234')
    await browser.$("center > input").click()
    await browser.$("//a[text()='SCM']").click()
    await browser.$("//span [text() = 'Purchase Orders']").click()
    
    await browser.$("#searchStatus").click()
    const selectBox1 = await $('#searchStatus');
    await selectBox1.selectByVisibleText('REQUESTER PO NO/STR NO');
    
    await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").click()
    //await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").setValue('Y5G2503282000033046')
    await browser.$("//input[@placeholder='REQUESTER PO NO/STR NO']").setValue(BUFFER.getItem('order_num'))
    await browser.$("//button[text()='SEARCH']").click()
    await browser.pause(3000)
    const po_num = await browser.$("//*[@id='results']/tbody/tr[2]/td[3]").getText()
    await browser.$("//*[@id='results']/tbody/tr[2]/td[3]").click()
    
    await browser.$("/html/body/main/form/div[3]/div/div[6]/div[5]/div[1]/select").click()
    const selectBox2 = await $('/html/body/main/form/div[3]/div/div[6]/div[5]/div[1]/select');
    await selectBox2.selectByVisibleText('Warehouse');
    
    await browser.$("//button[@name='btnCreateDO']").click()
    await browser.acceptAlert();
    
	await browser.$("//a[text()='Log out'] ").click()
 
    await browser.url(BUFFER.getItem('ycms_IoT_url'))
    //await browser.$("#username").click()
    await browser.$("#username").setValue(BUFFER.getItem('ycms_warehouse_userid'))
    //await browser.$("#username").setValue('jonathan.warehouse')
    await browser.$("#password").click()
    await browser.$("#password").setValue(BUFFER.getItem('ycms_warehouse_password'))
    //await browser.$("#password").setValue('password')
    await browser.$("center > input").click()
    await browser.$("//a[text()='SCM']").click()
    await browser.$("//span [text() = 'Delivery Orders']").click()
        
    await browser.$("/html/body/main/div[2]/form/div[2]/div[2]/div[1]/select").click()
    const selectBox3 = await $('/html/body/main/div[2]/form/div[2]/div[2]/div[1]/select');
    await selectBox3.selectByVisibleText('PO No.');
    
    await browser.$("//input[@placeholder='PO No.']").click()
    await browser.$("//input[@placeholder='PO No.']").setValue(po_num)
    await browser.$("//button[text()='SEARCH']").click()
    
    await browser.$("//*[@id='results']/tbody/tr[2]/td[3]").click()
    const rowCount = await $$("/html/body/main/div[2]/div/form/div[4]/div[3]/table/tbody/tr").length; // Get number of rows  
    console.log("Row Count:", rowCount);  
    let partNum = []; // Initialize an empty array  
    for (let i = 2; i <= rowCount; i++) {  
    let cellText = await $(`/html/body/main/div[2]/div/form/div[4]/div[3]/table/tbody/tr[${i}]/td[3]`).getText(); // Get first column text  
    partNum.push(cellText); // Add text to the array   
    }  
      
    await browser.$("//select[@name='ParentContainer:delveryOrderContainer1:logisticsOption']").click()
    const selectBox4 = await $("//select[@name='ParentContainer:delveryOrderContainer1:logisticsOption']");
    await selectBox4.selectByVisibleText('GDex');
    
    const consignmentNumber = Math.floor(100000 + Math.random() * 900000);
    console.log('Generated Number:', consignmentNumber);
       
    await browser.$("/html/body/main/div[2]/div/form/div[4]/div[5]/div[3]/input").click()
    await browser.$("/html/body/main/div[2]/div/form/div[4]/div[5]/div[3]/input").setValue(consignmentNumber)
    
    await browser.$("/html/body/main/div[2]/div/form/div[4]/div[9]/div/select").click()
    const selectBox5 = await $('/html/body/main/div[2]/div/form/div[4]/div[9]/div/select');
    await selectBox5.selectByVisibleText('Search Device List');
    
    for (let i = 0; i < partNum.length; i++) {  
      
    await browser.$("//*[@id='searchTxt']").click()
    await browser.$("//*[@id='searchTxt']").setValue(partNum[i])
    await browser.$("//button[@name='searchContainer:searchProdButton']").click()  
    await browser.$("/html/body/main/div[2]/div/form/div[4]/div[13]/div[1]/div/div/table/tbody/tr[2]/td[1]/input").click()
    await browser.$("/html/body/main/div[2]/div/form/div[4]/div[13]/div[1]/div/button").click()
      
    }
    await browser.$("//input[@value ='Save']").click()
    
  });
});


