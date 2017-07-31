### 仿微信手势解锁

扫码在线查看：

![仿微信手势解锁二维码](http://o8l2fza1x.bkt.clouddn.com/hand-lock.png)

最近一直想做个关于H5的小项目，在网上看到[H5HandLock](https://github.com/songjinzhong/H5HandLock)后，觉得这个和微信手势解锁挺像的，为何不做个类似微信手势解锁的小DEMO呢？于是说开搞就开搞，利用业余时间前前后后也花了3天。虽然是参考了别人的项目，但是弄明白之后还是学到了。

#### 修改的地方

##### canvas1和canvas2    
之前还不太明白为何要建立2个canvas，后来在设置密码画折线的时候才明白，我们需要一个canvas1画出圆和折线（已经划过的两圆之间），还需另外一个canvas2实时画出touchstart到touchend之间的连线
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
分别监听touchstart,touchmove,touchend事件，在touchstart事件中需要获取触点的坐标，并判断触点是否在大圆内。在touchmove事件中我们需要判断是否已接触到大圆，接触到了就画出圆点和折线。在touchend事件中需要对密码进行验证，并初始化已划过的圆和未划过的圆，最后需要初始化画布。
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
checkPassword函数主要用于根据当前模式来验证密码
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
        text.push(tc[i].id);//将圆的id作为密码存入
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
      text.length = 0; //清空之前的密码,这里不能用text = [].因为这样改变了text数组
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
**思路：**首先获取最后两个圆的圆心坐标，根据反三角函数计算出两圆心连线与水平轴之间的角度，最终计算出两圆连线的起始点(x1,y1)和终点(x2,y2)的坐标。
```js
drawLine: function() { // 画折线
  var len = this.touchCircles.length;//获取已经划过的圆的个数
  if (len >= 2) {
    var x1 = this.touchCircles[len - 2].x;//获取最后划过的倒数第二个圆的圆心x坐标
    var x2 = this.touchCircles[len - 1].x;//获取最后划过的倒数第一个圆的圆心x坐标
    var y1 = this.touchCircles[len - 2].y;
    var y2 = this.touchCircles[len - 1].y;
    var o;//最后两圆心连线与水平轴之间的角度（弧度单位）
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

1. 对info红色动画提示信息的动画处理不够流畅，本打算用css3来写，但时间不好控制，后来又改为用js写；  
2. 对例子中的节流函数理解不够透彻；
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

##### 加入节流函数
这里对高频函数touchmove事件采用节流函数处理  
```js
throttle: function(func, delay, mustRun) { // 节流函数
  var timer, startTime = new Date(),self = this;
  return function(e) {
    var curTime = new Date(),args = arguments;

    /* 处理由于延迟导致的 preventDefault 失效 */
    if (e) {
      e.preventDefault ? e.preventDefault() : null;
      e.stopPropagation ? e.stopPropagation() : null;
    }
    clearTimeout(timer);
    if (curTime - startTime >= mustRun) {
      startTime = curTime;
      func.apply(self, args);
    } else {
      timer = setTimeout(function() {
        func.apply(self, args);
      }, delay)
    }
  }
},
```
节流函数的意思：在延迟为 delay 的时间内，如果函数再次触发，则重新计时，这个功能和防抖动是一样的，第三个参数 mustRun 是一个时间间隔，表示在时间间隔大于 mustRun 后的一个函数可以立即直接执行。

关于 delay 和 mustRun 的时间间隔问题，web 性能里有一个 16ms 的概念，就是说如果要达到每秒 60 帧，间隔为 1000/60 大约为 16 ms。如果间隔大于 16ms 则 fps 会比 60 低。

鉴于此，我们这里将 delay 和 mustRun 都设为 16，在极端的情况下，也就是最坏的情况下，或许需要 15 + 15 = 30ms 才会执行一次，这个时候要设置两个 8 才合理，不过考虑到手指活动是一个连续的过程，怎么可能会每 15 秒执行一次，经过在线测试，发现设置成 16 效果还不错。






#### 参考

>[H5HandLock](https://github.com/songjinzhong/H5HandLock)  
>[防抖和节流](http://www.codeceo.com/article/web-high-performance-scroll.html)。
