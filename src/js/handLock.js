(function(win) {
  var handLock = function(option) {
    this.color = option.color || '#67ad65';
    this.bgColor = option.bgColor || "#f0f0f2";
    this.element = option.element; //

    this.info = this.element.previousElementSibling;
    this.message = this.element.firstChild.nodeType === 1 ? this.element.firstChild : this.element.firstChild.nextSibling;
    this.circles = []; // 用来存储 n*n 个 circle 的位置
    this.touchCircles = []; // 用来存储已经触摸到的所有 circle
    this.restCircles = []; // 还未触到的 circle

    this.touchFlag = false; // 用于判断是否 touch 到 circle
    this.reDraw = false; //表示是否需要重绘
    this.init();
  };

  handLock.prototype = {
    init: function() {
      this.createCanvas();
      this.createCircles();
      this.initPassword();
      this.createListener();
    },

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
    },

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

    initPassword: function() {
      this.setPassword = win.localStorage.getItem('HandLockPassword') ? {
        model: 3,
        text: win.localStorage.getItem('HandLockPassword').split('-') // 由于密码是字符串，要先转数组
      } : { model: 1, text: [] };
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

    createListener: function() { // 创建监听事件
      var self = this;
      this.canvas1.addEventListener('touchstart', function(e) {
        var p = self.getTouchPosition(e);
        self.judgePos(p);
      }, false);
      this.canvas1.addEventListener('touchmove', this.throttle(function(e) {
        var p = this.getTouchPosition(e);
        if (this.touchFlag) {
          this.update(p);
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
            self.reset();
            clearTimeout(timer);
          }, 400);
        }
      }, false);
    },


    getTouchPosition: function(e) { // 获得触摸点的相对位置
      var rect = e.target.getBoundingClientRect();
      var p = { // 相对坐标
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
      return p;
    },

    update: function(p) { // 更新 touchmove
      this.drawLine2TouchPos(p); //在canvas2画折线
      this.judgePos(p); //判断下一点是否在圆内
      if (this.reDraw) {
        this.reDraw = false;
        this.drawPoints(); //画实心圆
        this.drawLine(); //在canvas1画折线
      }
    },

    judgePos: function(p) { // 判断 触点 是否在 circle 內
      for (var i = 0, len = this.restCircles.length; i < len; i++) {
        if (Math.abs(p.x - this.restCircles[i].x) < this.r && Math.abs(p.y - this.restCircles[i].y) < this.r) {
          this.touchCircles.push(this.restCircles[i]);
          this.restCircles.splice(i, 1);
          this.touchFlag = true;
          this.reDraw = true;
          break;
        }
      }
    },

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
            text.push(tc[i].id);
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
          this.showInfo('密码不一致，请重新设置');
          this.setPassword.model = 1; // 由于密码不正确，回到 model 1
          text.length = 0; //清空之前的密码
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

    throttle: function(func, delay, mustRun) { // 节流函数
      var timer, startTime = new Date(),
        self = this;
      return function(e) {
        var curTime = new Date(),
          args = arguments;

        /* 修复一个 bug，由于延迟导致的 preventDefault 失效 */
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

    drawCircles: function() { // 画大圆
      for (var i = 0, len = this.circles.length; i < len; i++) {
        this.drawCircle(this.circles[i].x, this.circles[i].y);
      }
    },

    drawCircle: function(x, y, color) { // 画圆
      this.ctx1.strokeStyle = color || this.color;
      this.ctx1.fillStyle = this.bgColor;//给圆填充背景色，遮盖canvas2上的折线
      this.ctx1.lineWidth = 1;
      this.ctx1.beginPath();
      this.ctx1.arc(x, y, this.r, 0, Math.PI * 2, true); //0~2PI顺时针画圆弧
      this.ctx1.closePath();
      this.ctx1.fill();
      this.ctx1.stroke();
    },

    drawLine: function() { // 画折线
      var len = this.touchCircles.length;
      if (len >= 2) {
        var x1 = this.touchCircles[len - 2].x;
        var x2 = this.touchCircles[len - 1].x;
        var y1 = this.touchCircles[len - 2].y;
        var y2 = this.touchCircles[len - 1].y;
        var o;
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

    drawLine2TouchPos: function(p) {
      var len = this.touchCircles.length;
      if (len >= 1) {
        this.ctx2.clearRect(0, 0, this.width, this.width); // 先清空
        this.ctx2.strokeStyle = this.color;
        this.ctx2.beginPath();
        this.ctx2.lineWidth = 3;
        this.ctx2.moveTo(this.touchCircles[len - 1].x, this.touchCircles[len - 1].y);
        this.ctx2.lineTo(p.x, p.y);
        this.ctx2.stroke();
        this.ctx2.closePath();
      }
    },

    drawPoints: function() { // 画实心圆点
      var i = this.touchCircles.length - 1;
      if (i >= 0) {
        this.ctx1.fillStyle = this.color;
        this.ctx1.beginPath();
        this.ctx1.arc(this.touchCircles[i].x, this.touchCircles[i].y, this.r / 3, 0, Math.PI * 2, true);
        this.ctx1.closePath();
        this.ctx1.fill();
      }
    },

    reset: function() { // 重置 canvas
      this.ctx2.clearRect(0, 0, this.width, this.width);
      this.ctx1.clearRect(0, 0, this.width, this.width); // 清空画布，为了防止设置密码时重复画
      this.drawCircles();
    },

    showInfo: function(infoText) {
      var info = this.info,step = 0;
      this.redInfo = true;
      info.style.color = "#f00";
      info.innerHTML = infoText;

      var timer1 = setInterval(function() {
        step--;
        info.style.left = step + "px";
        if (step === -10) {
          clearInterval(timer1);
          var timer2 = setInterval(function() {
            step += 2;
            info.style.left = step + "px";
            if (step === 10) {
              clearInterval(timer2);
              var timer3 = setInterval(function() {
                step--;
                info.style.left = step + "px";
                if (step === 0) {
                  clearInterval(timer3);
                }
              }, 10);
            }
          }, 14);
        }
      }, 10);
    },

    showMessage: function(messageText, timer) { // 显示提示信息
      clearTimeout(this.showMessage.timer);
      var message = this.message;
      message.innerHTML = messageText;
      message.style.display = 'block';
      this.showMessage.timer = setTimeout(function() {
        message.style.display = 'none';
      }, timer || 1000)
    }


  }
  win.handLock = handLock; // 赋给全局 window
})(window);