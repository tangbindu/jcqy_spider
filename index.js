// 爬数据

const http = require("http")
const jsdom = require("jsdom")
const fs = require("fs")
const { JSDOM } = jsdom;
let request = require('request');
let requestPromise = require('request-promise')

tools={
    getToken(){
        return new Promise((resolve,reject)=>{
            request.post({url:'https://api.weixin.qq.com/cgi-bin/token', form:{
                "grant_type": "client_credential",
                "appid": "wxc6fbc71bc20976d4",
                "secret": "5d2968b9fa1578fdfd9d7068f0667810"
            }}, function(error, response, body) {
                resolve(JSON.parse(body).access_token)
            })
        })
    }
}

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
            let teams1 = body.getElementsByClassName("wh-4")[0].getElementsByTagName("a")[0].innerHTML;
            let teams2 = body.getElementsByClassName("wh-6")[0].getElementsByTagName("a")[0].innerHTML;
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
    let todayString, yesterdayString;
    let today = new Date();
    todayString = today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).slice(-2) + "-" + ("0" + (today.getDay() - 1)).slice(-2)
    let yesterday = new Date();
    yesterday.setDate(today.getDate() - 1)
    yesterdayString = today.getFullYear() + "-" + ("0" + (yesterday.getMonth() + 1)).slice(-2) + "-" + ("0" + (yesterday.getDay() + 1)).slice(-2);
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
        localMatchsList.forEach(localMatch=>{
            switch()
        })
    })
}



// 规则
// 只爬最近三天的数据
// 只存三天的数据，有变化就同步到服务器
let mySpider = {
    //爬取时间
    spriteTime: [
        "06:00",
        "11:00",
        "11:00",
        "11:00",
        "11:00",
        "12:34",
    ],
    localMatchsBuffer: fs.readFileSync('./matchsBuffer.json').toString(),
    //当前时间
    currentTime: null,
    //当前时间串
    currentTimeString: null,
    work() {
        console.log("爬虫开始工作")
        setInterval(() => {
            this.currentTime = new Date();
            this.currentTimeString = ("00" +this.currentTime.getHours()).slice(-2) + ":" + ("00" + this.currentTime.getMinutes()).slice(-2);
            this.spriteTime.forEach(st => {
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
        }, 30000) //上线建议20秒 20000
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


