// 爬数据

const http = require("http")
const jsdom = require("jsdom")
const fs = require("fs")
const { JSDOM } = jsdom;
let request = require('request');
let requestPromise = require('request-promise');
let token=null;



tools={
    getToken(){
        request.post({url:'https://api.weixin.qq.com/cgi-bin/token', form:{
            "grant_type": "client_credential",
            "appid": "wxc6fbc71bc20976d4",
            "secret": "5d2968b9fa1578fdfd9d7068f0667810"
        }}, function(error, response, body) {
            token=JSON.parse(body).access_token;
        })
    }
}

setInterval(()=>{
    //半小时更新一次token
    tools.getToken();
},1800000)
tools.getToken();



//爬网页数据
function spiderHtmlFromWebSite(url) {
    return new Promise((resolve, reject) => {
        http.get(url, function (res) {
            var html = '';
            // 这里将会触发data事件，不断触发不断跟新html直至完毕
            res.on('data', function (data) {
                html += data
            })
            // 当数据获取完成将会触发end事件，这里将会打印初node官网的html
            res.on('end', function () {
                resolve(html)
            })
        }).on('error', function () {
            console.log('获取数据失败，查看网络是否正常，或者http://cp.zgzcw.com/是否正常')
        })
    })
}
//获取想要的数据
function getMatchFromHTML(html) {
    const dom = new JSDOM(html);
    const body = dom.window.document.body;
    const spiderTable = body.getElementsByClassName("zjq-body")[0];
    const matchGroupTitleList = spiderTable.getElementsByClassName("tz-t");
    const matchGroupDataList = spiderTable.getElementsByClassName("mb");
    const allMatchStartToday = [];
    for (var i = 0; i < matchGroupDataList.length; i++) {
        let trs = matchGroupDataList[i].getElementsByTagName("tr");
        let timeString = matchGroupTitleList[i].getElementsByTagName("strong")[0].innerHTML;
        let date = timeString.replace(/&nbsp;/g, "").split("[")[0].slice(0, -3);
        let time = timeString.replace(/&nbsp;/g, "").split("[")[1].replace(/]/g, "").replace(/--/g, "-").replace(/：/g, ":");
        for (var j = 0; j < trs.length; j++) {
            let id = trs[j].getElementsByTagName("i")[0].innerHTML;
            let teams1 = trs[j].getElementsByClassName("wh-4")[0].getElementsByTagName("a")[0].innerHTML;
            let teams2 = trs[j].getElementsByClassName("wh-6")[0].getElementsByTagName("a")[0].innerHTML;
            let oddsNodeParent = body.getElementsByClassName("wh-7")[0];
            let odds = [
                oddsNodeParent.getElementsByTagName("a")[0].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[1].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[2].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[3].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[4].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[5].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[6].innerHTML.replace(/[^\d.]/g, ""),
                oddsNodeParent.getElementsByTagName("a")[7].innerHTML.replace(/[^\d.]/g, "")
            ];
            let score = trs[j].getElementsByClassName("wh-5")[0].innerHTML.replace(/\s/g, "").replace("VS","");
            allMatchStartToday.push({
                matchid: (date + id).replace(/-/g, ""),
                date: date,
                time: time,
                id: id,
                teams: [teams1, teams2],
                odds: odds,
                score: score
            })
        }
    }
    return allMatchStartToday;
}
//获取多天，默认两天
function getMutipDays() {
    let offset=-2;
    let todayString, yesterdayString;
    let today = new Date();
    today.setDate(today.getDate()+offset);
    todayString = today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).slice(-2) + "-" + ("0" + today.getDate()).slice(-2)
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() + offset+1)
    yesterdayString = yesterday.getFullYear() + "-" + ("0" + (yesterday.getMonth() + 1)).slice(-2) + "-" + ("0" + yesterday.getDate()).slice(-2);
    console.log(todayString, yesterdayString)
    return [todayString, yesterdayString]
}
//爬取多天的数据
function spiderMutipDays() {
    return new Promise((resolve, reject) => {
        console.log("爬一次数据：" + new Date().getHours() + ":" + ("0" + new Date().getMinutes()).slice(-2))
        let days = getMutipDays();
        let spriderPromiseList = [];
        let mutipDaysMatchs = [];
        days.forEach((day) => {
            spriderPromiseList.push(spiderHtmlFromWebSite("http://cp.zgzcw.com/lottery/jcplayvsForJsp.action?lotteryId=24&issue=" + day))
        })
        Promise.all(spriderPromiseList).then(result => {
            result.forEach(html => {
                let matchs = getMatchFromHTML(html);
                mutipDaysMatchs = mutipDaysMatchs.concat(matchs)
            })
            resolve(mutipDaysMatchs)
        })
    })
}
//查询云数据库
function queryCloudMatchsList(){
    return new Promise((resolve,reject)=>{
        let options = {
            method: 'POST',
            uri: 'https://api.weixin.qq.com/tcb/databasequery?access_token=' + token + '',
            body: {
                "env":'jcyq-2knc5',
                "query":"db.collection('matchData').limit(30).get()",
            },
            json:true
        }
        requestPromise(options).then(res=>{
            resolve(res.data)
        })
    })
}
//更新云赛事
function updateMatch(id,match){
    new Promise((resolve,reject)=>{
        tools.getToken().then(token=>{
            let options = {
                method: 'POST',
                uri: 'https://api.weixin.qq.com/tcb/databasequery?access_token=' + token + '',
                body: {
                    "env":'jcyq-2knc5',
                    "query":"db.collection('matchData').limit(10).get()",
                },
                json:true
            }
            requestPromise(options).then(res=>{
                resolve(res.data)
            })
        })
    })
}
//新增云赛事
function addMatch(id,match){
    new Promise((resolve,reject)=>{
        tools.getToken().then(token=>{
            let options = {
                method: 'POST',
                uri: 'https://api.weixin.qq.com/tcb/databasequery?access_token=' + token + '',
                body: {
                    "env":'jcyq-2knc5',
                    "query":"db.collection('matchData').limit(10).get()",
                },
                json:true
            }
            requestPromise(options).then(res=>{
                resolve(res.data)
            })
        })
    })
}
//推送到云数据库
function pushToCloudDatabase(localMatchsList){
    queryCloudMatchsList().then(cloudMatchsList=>{
        cloudMatchsList.forEach((item,index)=>{
            item.matchid=item.matchid?item.matchid: null;
            item.score=item.score?item.score: null;
            cloudMatchsList[index]=JSON.parse(item);
        })
        let addList=[];//新增列表
        let updateList=[];//更新列表
        localMatchsList.forEach(localMatch=>{
            let findCloudOne=cloudMatchsList.find(item=>item.matchid==localMatch.matchid);
            if(findCloudOne){
                if(findCloudOne.score!=localMatch.score){
                    updateList.push(localMatch)
                }
            }else{
                addList.push(localMatch)
            }
        })
        console.log("新增数据:")
        console.dir(addList)
        console.log("更新数据:")
        console.dir(updateList)
        //完成推送
        if(addList.length>0){
            let options = {
                method: 'POST',
                url: 'https://api.weixin.qq.com/tcb/databaseadd?access_token=' + token + '',
                body: {
                    "env":'jcyq-2knc5',
                    "query":`db.collection('matchData').add({data:${JSON.stringify(addList)}})`,
                },
                json:true
            }
            requestPromise(options).then(res=>{
                console.log(`add到云数据库成功,共添加了${addList.length}条数据`)
            })
        }
        //完成推送
        if(updateList.length>0){
            updateList.forEach(element => {
                let options = {
                    method: 'POST',
                    uri: 'https://api.weixin.qq.com/tcb/databaseupdate?access_token=' + token + '',
                    body: {
                        "env":'jcyq-2knc5',
                        "query":`db.collection('matchData').where({'matchid':'${element.matchid}'}).update({data:${JSON.stringify(element)}})`,
                    },
                    json:true
                }
                requestPromise(options).then(res=>{
                    console.log("update到云数据库成功,单次更新1条数据")
                })
            });
        }
        
    })
}



// 规则
// 只爬最近三天的数据
// 只存三天的数据，有变化就同步到服务器
let mySpider = {
    //爬取时间
    spiderTime: [ 
        "00:00",
        "01:00",
        "02:00",
        "03:00",
        "04:00",
        "05:00",
        "06:00",
        "07:00",
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
        "20:21"
    ],
    // Array(24).fill("1").forEach((item,index)=>{
    //     console.log(("0"+index).slice(-2)+":00")
    // })
    localMatchsBuffer: fs.readFileSync('./matchsBuffer.json').toString(),
    //当前时间
    currentTime: null,
    //当前时间串
    currentTimeString: null,
    work() {
        console.log(">>爬虫开始工作,等待触发时间")
        setInterval(() => {
            this.currentTime = new Date();
            this.currentTimeString = ("00" +this.currentTime.getHours()).slice(-2) + ":" + ("00" + this.currentTime.getMinutes()).slice(-2);
            this.spiderTime.forEach(st => {
                if (st == this.currentTimeString) {
                    //时间相等就去爬
                    spiderMutipDays().then(matchsList => {
                        let matchListString = JSON.stringify({ matchsList: matchsList });
                        this.pushMatchsList(matchListString,matchsList)
                    });
                } else {
                    // console.log("休息" + this.currentTimeString)
                }
            })
        }, 10000) //上线建议20秒 20000
    },
    //推送到服务器
    pushMatchsList(matchListString,matchsList) {
        console.dir(matchsList)
        if (matchListString != this.localMatchsBuffer) {
            //推送云数据库
            pushToCloudDatabase(matchsList);
            //更新本地存储
            fs.writeFile('./matchsBuffer.json', matchListString, function (err) {
                console.log("数据写入成功！");
            });
            this.localMatchsBuffer = matchListString
        } else {
            //已经是最新的了
            console.log("赛事已经是最新的了");
        }
    }
}
mySpider.work();


