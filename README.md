### 仿微信手势解锁

扫码在线查看：

![](imgs/url.png)

最近一直想做个关于H5的小项目，在网上看到[H5HandLock](https://github.com/songjinzhong/H5HandLock)后，觉得这个和微信手势解锁挺像的，为何不做个类似微信手势解锁的小DEMO呢？于是说开搞就开搞，利用业余时间前前后后也花了3天。虽然是参考了别人的项目，但是弄明白之后还是学到了。

#### 修改的地方
因为我这个是模仿微信手势解锁，所以将部分内容改为和微信相似，这里涉及到以下内容：

##### canvas1和canvas2    
之前还不太明白为何要建立2个canvas，后来在设置密码画折线的时候才明白，我们需要一个canvas1画出圆和折线（已经划过的两圆之间），还需另外一个canvas2画出touchstart到touchend之间的折线
```js
createCanvas: function() {
  var rectWidth = this.element.getBoundingClientRect().width,
  width = rectWidth < 300 ? 300 : rectWidth;

  var canvas1 = document.createElement('canvas');
  canvas1.width = canvas1.height = width;
  this.element.appendChild(canvas1);

  var canvas2 = canvas1.cloneNode();
  canvas2.style.cssText = "position:absolute;top:0;left:0;z-index:-1;";
  this.element.appendChild(canvas2);

  this.ctx1 = canvas1.getContext('2d');
  this.canvas1 = canvas1;
  this.width = width;

  this.ctx2 = canvas2.getContext('2d');
  this.canvas2 = canvas2;
}
```
##### 画圆   
这里将两圆之间的空白区域的宽度设置为圆的直径的2/3，为了更贴近微信的效果，将大圆改为实心圆  
```js
createCircles: function() {
  var n = 3; //大圆的个数
  // 盒子的宽度 = (n+1)个空白间隔区域的宽度 + n个圆的宽度
  // this.width = (n+1)*2/3*2*r + n*2*r
  this.r = 3 * this.width / (4 + 10 * n);
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      var circlePos = {
        x: j * 10 / 3 * this.r + 7 / 3 * this.r, //圆的x坐标
        y: i * 10 / 3 * this.r + 7 / 3 * this.r, //圆的y坐标
        id: i * 3 + j
      }
      this.circles.push(circlePos);
      this.restCircles.push(circlePos);
    }
  }
  this.drawCircles();
},
drawCircles: function() { // 画大圆
  for (var i = 0, len = this.circles.length; i < len; i++) {
    this.drawCircle(this.circles[i].x, this.circles[i].y);
  }
},
drawCircle: function(x, y, color) { 
  this.ctx1.strokeStyle = color || this.color;
  this.ctx1.fillStyle = this.bgColor;//给圆填充背景色，遮盖canvas2上的折线
  this.ctx1.lineWidth = 1;
  this.ctx1.beginPath();
  this.ctx1.arc(x, y, this.r, 0, Math.PI * 2, true); //0~2PI顺时针画圆弧
  this.ctx1.closePath();
  this.ctx1.fill(); 
  this.ctx1.stroke();
},
```
**初始化密码并更新状态**  
判断localStorage中是否已存储密码来改变当前模式
```js
initPassword: function() {
  this.setPassword = win.localStorage.getItem('HandLockPassword') ? {
    model: 3,
    text: win.localStorage.getItem('HandLockPassword').split('-') // 由于密码是字符串，要先转数组
  } : { 
    model: 1, 
    text: [] 
  };
  this.updateInfo();
},

updateInfo: function() { // 根据当前模式，更新info
  if (this.redInfo) { //如果已存在红色提示信息，则将其设置为黑色
    this.redInfo = false;
    this.info.style.color = "#000";
  }
  if (this.setPassword.model === 1) { // 1 表示初始化设置密码
    this.info.innerHTML = '请设置手势密码';
  } else if (this.setPassword.model === 2) { // 2 表示确认密码
    this.info.innerHTML = '再次输入以确认';
  } else if (this.setPassword.model === 3) { // 3 表示验证密码
    this.info.innerHTML = '请输入手势密码';
  }
},
```
##### 监听屏幕touch事件
```js
createListener: function() { // 创建监听事件
  var self = this;
  this.canvas1.addEventListener('touchstart', function(e) {
    var p = self.getTouchPosition(e);//得到触点的坐标
    self.judgePos(p);//判断触点是否在圆内
  }, false);
  this.canvas1.addEventListener('touchmove', this.throttle(function(e) {//运用了节流函数
    var p = this.getTouchPosition(e);
    if (this.touchFlag) {
      this.update(p); //更新touchmove，画圆点和折线
    } else {
      this.judgePos(p);
    }
  }, 16, 16), false);
  this.canvas1.addEventListener('touchend', function(e) {
    if (self.touchFlag) {
      self.touchFlag = false;
      self.checkPassword();
      self.restCircles = self.restCircles.concat(self.touchCircles.splice(0)); // 将resetCircles,touchCircles初始化
      var timer = setTimeout(function() {
        self.reset();//初始化画布
        clearTimeout(timer);
      }, 400);
    }
  }, false);
}
```
##### 其他辅助函数
还有一些辅助函数就不一一贴出代码了，介绍其中觉得比较重要的地方。  
checkPassword函数主要用于根据当前模式来判断密码
```js
checkPassword: function() { // 判断当前模式和检查密码
  var model = this.setPassword.model,
  text      = this.setPassword.text,
  success   = true,
  tc        = this.touchCircles; //已经划过的圆
  
  var check = function(){
    if (tc.length === text.length) { // 先要验证密码是否正确
      for (var i = 0; i < tc.length; i++) {
        if (tc[i].id != text[i]) {
          success = false;
        }
      }
    } else {
      success = false;
    }
  };

  if (model === 1) { // 设置密码
    if (tc.length < 5) { // 验证密码长度
      this.showInfo("至少连接5个点，请重新绘制");
    } else {
      for (var i = 0; i < tc.length; i++) {
        text.push(tc[i].id);//将元的id作为密码存入
      }
      this.setPassword.model = 2;
      this.updateInfo();
    }
  } else if (model === 2) { // 确认密码
    check();

    if (success) {
      win.localStorage.setItem('HandLockPassword', text.join('-')); // 密码正确，localStorage 存储
      this.showMessage('手势密码设置成功', 1000);
      this.setPassword.model = 3;
      this.updateInfo();
    } else {
      this.showInfo('密码不一致，请重新设置');//红色动画提示信息
      this.setPassword.model = 1; // 由于密码不正确，回到 model 1
      this.setPassword.text = []; //清空之前的密码
    }
  } else if (model === 3) { // 验证密码
    check();

    if (success) {
      this.showMessage('恭喜你，验证通过', 1000);
      win.location = "http://www.jesse131.cn/blog/index.html"; //成功后跳转
    } else {
      this.showMessage('很遗憾，密码错误', 1000);
    }
  }
},
```
drawLine函数主要用于画两大圆之间的连线，原例子中是采用两圆圆心之间的连线，为了贴近微信的效果将其改为两圆之间的连线（除去了圆心部分）
```js
drawLine: function() { // 画折线
  var len = this.touchCircles.length;//获取已经划过的圆的个数
  if (len >= 2) {
    var x1 = this.touchCircles[len - 2].x;//获取最后划过的倒数第二个圆的圆心x坐标
    var x2 = this.touchCircles[len - 1].x;//获取最后划过的倒数第一个圆的圆心x坐标
    var y1 = this.touchCircles[len - 2].y;
    var y2 = this.touchCircles[len - 1].y;
    var o;//最后两圆之间连线的角度（弧度单位）
    if (y1 >= y2) {
      if (x2 >= x1) { //左上半部分
        o = Math.atan((y1 - y2) / (x2 - x1));
      } else {
        o = Math.PI + Math.atan((y1 - y2) / (x2 - x1));
      }
    } else {
      if (x2 >= x1) { //左下半部分
        o = -Math.atan((y2 - y1) / (x2 - x1));
      } else {
        o = Math.PI - Math.atan((y2 - y1) / (x2 - x1));
      }
    }
    var xn1 = x1 + this.r * Math.cos(o);
    var yn1 = y1 - this.r * Math.sin(o);
    var xn2 = x2 - this.r * Math.cos(o);
    var yn2 = y2 + this.r * Math.sin(o);
    this.ctx1.beginPath();
    this.ctx1.lineWidth = 3;
    this.ctx1.moveTo(xn1, yn1);
    this.ctx1.lineTo(xn2, yn2);
    this.ctx1.stroke();
    this.ctx1.closePath();
  }
},
```
#### 有待改进的地方
尽管手势解锁基本功能已实现，但仍有许多地方需要改进

1. 对info红色动画提示信息的动画处理不够流畅，本打算用css3来写，但时间不好控制，后来又改为js；
2.对例子中的节流函数理解不够透彻；
3. 没有限制密码错误输入次数和忘记密码功能。

#### 值得学习的地方

##### 整体架构
这里采用了新建handLock构造函数，并在其prototype属性上扩充各种方法。jQuery源码中方法的扩充也是采用这种方法
```javascript
(function(win){
  var handLock = function(option){}

  handLock.prototype = {
    init : function(){},
    ...
  }

  win.handLock = handLock;
})(window);
```














### 3. 画折线

所谓的画折线，就是，将已经触摸到的点连起来，可以把它看作是画折线。

首先，要用两个数组，一个数组用于已经 touch 过的点，另一个数组用于存储未 touch 的点，然后在 move 监听时候，对 touch 的相对位置进行判断，如果触到点，就把该点从未 touch 移到 touch 中，然后，画折线，思路也很简单。

```javascript
drawLine: function(p){ // 画折线
  this.ctx.beginPath();
  this.ctx.lineWidth = 3;
  this.ctx.moveTo(this.touchCircles[0].x, this.touchCircles[0].y);
  for (var i = 1 ; i < this.touchCircles.length ; i++) {
    this.ctx.lineTo(this.touchCircles[i].x, this.touchCircles[i].y);
  }
  this.ctx.lineTo(p.x, p.y);
  this.ctx.stroke();
  this.ctx.closePath();
},
```

```javascript
judgePos: function(p){ // 判断 触点 是否在 circle 內
  for(var i = 0; i < this.restCircles.length; i++){
    temp = this.restCircles[i];
    if(Math.abs(p.x - temp.x) < r && Math.abs(p.y - temp.y) < r){
      this.touchCircles.push(temp);
      this.restCircles.splice(i, 1);
      this.touchFlag = true;
      break;
    }
  }
}
```







### 3. 关于密码

先不考虑从 localStorage 读取到情况，新加一个 lsPass 对象，专门用于存储密码，由于密码情况比较多，比如设置密码，二次确认密码，验证密码，为了方便管理，暂时设置了密码的三种模式，分别是：

>model：1 验证密码模式

>model：2 设置密码模式

>model：3 设置密码二次验证




这三种 model ，只要处理好它们之间如何跳转就 ok 了，即状态的改变。

所以就有了 initPass：

```javascript
initPass: function(){ // 将密码初始化
  this.lsPass = w.localStorage.getItem('HandLockPass') ? {
    model: 1,
    pass: w.localStorage.getItem('HandLockPass').split('-')
  } : { model: 2 };
  this.updateMessage();
},

updateMessage: function(){ // 根据当前模式，更新 dom
  if(this.lsPass.model == 2){
    this.dom.setPass.checked = true;
    this.dom.message.innerHTML = '请设置手势密码';
  }else if(this.lsPass.model == 1){
    this.dom.checkPass.checked = true;
    this.dom.message.innerHTML = '请验证手势密码';
  }else if(this.lsPass.model = 3){
    this.dom.setPass.checked = true;
    this.dom.message.innerHTML = '请再次输入密码';
  }
},
```


## 关于优化

性能优化一直都是一个大问题，不要以为前端不需要考虑内存，就可以随便写代码。

之前在设计自己网页的时候，用到了滚动，鼠标滑轮轻轻一碰，滚动函数就执行了几十多则几百次，之前也考虑过解决办法。

### 优化 canvas 部分

对于 touchmove 函数，原理都是一样的，手指一划，就执行了 n 多次，这个问题后面在解决，先来看另一个问题。

touchmove 是一个高频函数，看到这里，如果你并没有仔细看我的代码，那你对我采用的 canvas 画图方式可能不太了解，下面这个是 touchmove 函数干了哪些事：

1. 先判断，如果当前处于未选中一个密码状态，则继续监视当前的位置，直到选中第一个密码，进入第二步；
2. 进入 update 函数，update 函数主要干四件事，重绘圆（密码）、判断当前位置、重绘点、重绘线；

第二步是一个很揪心的动作，为什么每次都要重绘圆，点和线呢？

![](imgs/p1.png)

上面这个图可以很好的说明问题，因为在设置或验证密码的过程中，我们需要用一条线来连接触点到当前的最后一个密码，并且当 touchmove 的时候，能看到它们在变化。这个功能很棒，可以勾勒出 touchmove 的轨迹。

但是，这就必须要时刻刷新 canvas，性能大大地降低，**刷新的那可是整个 canvas。**

因为 canvas 只有一个，既要画背景圆（密码），又要画已选密码的点，和折线。这其中好多步骤，自始至终只需要一次就好了，比如背景圆，只需在启动的时候画一次，已选密码，只要当 touchCircles 新加元素的时候才会用一次，还不用重绘，只要画就可以了。折线分成两部分，一部分是已选密码之间的连线，还有就是最后一个密码点到当前触点之间的连线。

**如果有两个 canvas 就好了，一个存储静态的，一个专门用于重绘**。

为什么不可以有呢！

我的解决思路是，现在有两个 canvas，一个在底层，作为描绘静态的圆、点和折线，另一个在上层，一方面监听 touchmove 事件，另一方面不停地重绘最后一个密码点的圆心到当前触点之间的线。如果这样可以的话，touchmove 函数执行一次的效率大大提高。

插入第二个 canvas：

```javascript
var canvas2 = canvas.cloneNode(canvas, true);
canvas2.style.position = 'absolute';//让上层 canvas 覆盖底层 canvas
canvas2.style.top = '0';
canvas2.style.left = '0';
this.el.appendChild(canvas2);
this.ctx2 = canvas2.getContext('2d');
```

要改换对第二个 ctx2 进行 touch 监听，并设置一个 `this.reDraw` 参数，表示有新的密码添加进来，需要对点和折线添加新内容， update 函数要改成这样：

```javascript
update: function(p){ // 更新 touchmove
  this.judgePos(p); // 每次都要判断
  this.drawLine2TouchPos(p); // 新加函数，用于绘最后一个密码点点圆心到触点之间的线
  if(this.reDraw){ // 有新的密码加进来
    this.reDraw = false;
    this.drawPoints(); // 添加新点
    this.drawLine();// 添加新线
  }
},
```

```javascript
drawLine2TouchPos: function(p){
  var len = this.touchCircles.length;
  if(len >= 1){
    this.ctx2.clearRect(0, 0, this.width, this.width); // 先清空
    this.ctx2.beginPath();
    this.ctx2.lineWidth = 3;
    this.ctx2.moveTo(this.touchCircles[len - 1].x, this.touchCircles[len - 1].y);
    this.ctx2.lineTo(p.x, p.y);
    this.ctx2.stroke();
    this.ctx2.closePath();
  }
},
```

相应的 drawPoints 和 drawLine 函数也要对应修改，由原理画所有的，到现在只需要画新加的。

效果怎么样：

![](imgs/p2.png)

move 函数执行多次，而其他函数只有当新密码加进来的时候才执行一次。

### 加入节流函数

之前也已经说过了，这个 touchmove 函数执行的次数比较多，尽管我们已经用两个 canvas 对重绘做了很大的优化，但 touchmove 还是有点大开销。

这个时候我想到了防抖动和节流，首先防抖动肯定是不行的，万一我一直处于 touch 状态，重绘会延迟死的，这个时候节流会好一些。[防抖和节流](http://www.codeceo.com/article/web-high-performance-scroll.html)。

先写一个节流函数：

```javascript
throttle: function(func, delay, mustRun){
  var timer, startTime = new Date(), self = this;
  return function(){
    var curTime = new Date(), args = arguments;
    clearTimeout(timer);
    if(curTime - startTime >= mustRun){
      startTime = curTime;
      func.apply(self, args);
    }else{
      timer = setTimeout(function(){
        func.apply(self, args);
      }, delay)
    }
  }
}
```

节流函数的意思：在延迟为 delay 的时间内，如果函数再次触发，则重新计时，这个功能和防抖动是一样的，第三个参数 mustRun 是一个时间间隔，表示在时间间隔大于 mustRun 后的一个函数可以立即直接执行。

然后对 touchmove 的回调函数进行改造：

```javascript
var t = this.throttle(function(e){
  e.preventDefault ? e.preventDefault() : null;
  e.stopPropagation ? e.stopPropagation() : null;
  var p = this.getTouchPos(e);
  if(this.touchFlag){
    this.update(p);
  }else{
    this.judgePos(p);
  }
}, 16, 16)
this.canvas2.addEventListener('touchmove', t, false)
```

关于 delay 和 mustRun 的时间间隔问题，web 性能里有一个 16ms 的概念，就是说如果要达到每秒 60 帧，间隔为 1000/60 大约为 16 ms。如果间隔大于 16ms 则 fps 会比 60 低。

鉴于此，我们这里将 delay 和 mustRun 都设为 16，在极端的情况下，也就是最坏的情况下，或许需要 15 + 15 = 30ms 才会执行一次，这个时候要设置两个 8 才合理，不过考虑到手指活动是一个连续的过程，怎么可能会每 15 秒执行一次，经过在线测试，发现设置成 16 效果还不错。

性能真的能优化吗，我们来看两个图片，do 和 wantdo 表示真实执行和放到节流函数中排队准备执行。

当 touchmove 速度一般或很快的时候：

![](imgs/p3.png)

当 touchmove 速度很慢的时候：

![](imgs/p4.png)

可以看出来，滑动过程中，速度一般和快速，平均优化了一半，慢速效果也优化了 20 到 30% 之间，平时手势锁解锁时候，肯定速度很快。可见，节流的优化还是很明显的。

**关键是，优化之后的流程性，没有受到任何影响。**

这个节流函数最终还是出现了一个 bug：由于是延迟执行的，导致 `e.preventDefault` 失效，在手机浏览器向下滑会出现刷新的情况，这也算事件延迟的一个危害吧。

解决办法：在节流函数提前取消默认事件：

```javascript
throttle: function(func, delay, mustRun){
  var timer, startTime = new Date(), self = this;
  return function(e){
    if(e){
      e.preventDefault ? e.preventDefault() : null; //提前取消默认事件，不要等到 setTimeout
      e.stopPropagation ? e.stopPropagation() : null;
    }
    ...
  }
}
```


#### 参考

>[H5HandLock](https://github.com/songjinzhong/H5HandLock)
