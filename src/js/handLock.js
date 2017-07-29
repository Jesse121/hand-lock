(function(win) {
  var handLock = function(option) {
    this.n = (option.n >= 2 && option.n <= 5) ? option.n : 3; // 圆的个数
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
      var width, elRect;
      elRect = this.element.getBoundingClientRect();
      width = elRect.width < 300 ? 300 : elRect.width;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = width;
      this.element.appendChild(canvas);

      var canvas2 = canvas.cloneNode(canvas, true);
      canvas2.style.position = 'absolute';
      canvas2.style.top = '0';
      canvas2.style.left = '0';
      canvas2.style.zIndex = "-1";
      this.element.appendChild(canvas2);

      this.ctx = canvas.getContext('2d');
      this.canvas = canvas;
      this.width = width;

      this.ctx2 = canvas2.getContext('2d');
      this.ctx2.strokeStyle = this.color;
      this.canvas2 = canvas2;
    },

    createCircles: function() {
      var n = this.n;
      // 盒子的宽度 = (n+1)个空白间隔区域的宽度 + n个圆的宽度
      // this.width = (n+1)*2*this.r + n*2*this.r
      this.r = Math.floor(this.width / (2 + 4 * n));
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          var circlePos = {
            x: j * 4 * this.r + 3 * this.r,
            y: i * 4 * this.r + 3 * this.r,
            id: i * 3 + j
          }
          this.circles.push(circlePos);
          this.restCircles.push(circlePos);
        }
      }
      this.drawCircles();
    },

    initPassword: function() {
      this.lsPass = win.localStorage.getItem('HandLockPassword') ? {
        model: 3,
        pass: win.localStorage.getItem('HandLockPassword').split('-') // 由于密码是字符串，要先转数组
      } : { model: 1 };
      this.updateInfo();
    },

    updateInfo: function() { // 根据当前模式，更新info
      this.info.style.color = "#000";
      if (this.lsPass.model === 1) { // 1 表示初始化设置密码
        this.info.innerHTML = '请设置手势密码';
      } else if (this.lsPass.model === 2) { // 2 表示确认密码
        this.info.innerHTML = '再次输入以确认';
      } else if (this.lsPass.model === 3) { // 3 表示验证密码
        this.info.innerHTML = '请输入手势密码';
      }
    },

    createListener: function() { // 创建监听事件
      var self = this,
        temp, r = this.r,
        over = false;
      this.canvas.addEventListener('touchstart', function(e) {
        var p = self.getTouchPosition(e);
        self.restCircles = self.restCircles.concat(self.touchCircles.splice(0));
        self.judgePos(p);
      }, false);
      this.canvas.addEventListener('touchmove', this.throttle(function(e) {
        var p = this.getTouchPosition(e);
        if (this.touchFlag) {
          this.update(p);
        } else {
          this.judgePos(p);
        }
      }, 16, 16), false);
      this.canvas.addEventListener('touchend', function(e) {
        if (self.touchFlag) {
          self.touchFlag = false;
          self.checkPassword();
          self.restCircles = self.restCircles.concat(self.touchCircles.splice(0)); // 将touchCircle 清空
          // self.ctx2.clearRect(0, 0, this.width, this.width); // 提前做情况操作
          setTimeout(function() {
            self.reset();
          }, 400)
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
      this.judgePos(p);
      this.drawLine2TouchPos(p);
      if (this.reDraw) {
        this.reDraw = false;
        this.drawPoints();
        this.drawLine();
      }
    },

    judgePos: function(p) { // 判断 触点 是否在 circle 內
      for (var i = 0; i < this.restCircles.length; i++) {
        temp = this.restCircles[i];
        if (Math.abs(p.x - temp.x) < this.r && Math.abs(p.y - temp.y) < this.r) {
          this.touchCircles.push(temp);
          this.restCircles.splice(i, 1);
          this.touchFlag = true;
          this.reDraw = true;
          break;
        }
      }
    },

    checkPassword: function() { // 判断当前模式和检查密码
      var success, model = this.lsPass.model;

      if (model === 1) { // 设置密码
        if (this.touchCircles.length < 5) { // 验证密码长度
          success = false;
          this.showInfo("至少连接5个点，请重新绘制");
        } else {
          success = true;
          this.lsPass.temp = []; // 将密码放到临时区存储
          for (var i = 0; i < this.touchCircles.length; i++) {
            this.lsPass.temp.push(this.touchCircles[i].id);
          }
          this.lsPass.model = 2;
          this.updateInfo();
        }
      } else if (model == 2) { // 确认密码
        var flag = true;
        // 先要验证密码是否正确
        if (this.touchCircles.length == this.lsPass.temp.length) {
          var tc = this.touchCircles,
            lt = this.lsPass.temp;
          for (var i = 0; i < tc.length; i++) {
            if (tc[i].id != lt[i]) {
              flag = false;
            }
          }
        } else {
          flag = false;
        }

        if (flag) {
          success = true; // 密码正确，localStorage 存储，并设置状态为 model 1
          win.localStorage.setItem('HandLockPassword', this.lsPass.temp.join('-')); // 存储字符串
          this.showMessage('手势密码设置成功', 1000);
          this.lsPass.model = 3;
          this.lsPass.pass = this.lsPass.temp;
          this.updateInfo();
          // win.location = "http://www.jesse131.cn/blog/index.html"; //成功后跳转
        } else {
          success = false;
          this.showInfo('密码不一致，请重新设置');
          
            this.lsPass.model = 1; // 由于密码不正确，重新回到 model 2
        }
        delete this.lsPass.temp; // 清空临时区存储的密码
      } else if (model == 3) { // 验证密码
        var tc = this.touchCircles,
          lp = this.lsPass.pass,
          flag = true;
        if (tc.length == lp.length) {
          for (var i = 0; i < tc.length; i++) {
            if (tc[i].id != lp[i]) {
              flag = false;
            }
          }
        } else {
          flag = false;
        }
        if (!flag) {
          success = false;
          this.showMessage('很遗憾，密码错误', 1000);
        } else {
          success = true;
          this.showMessage('恭喜你，验证通过', 1000);
          win.location = "http://www.jesse131.cn/blog/index.html"; //成功后跳转

        }
      }

      // if (success) {
      //   this.drawEndCircles('#2CFF26'); // 绿色
      // } else {
      //   this.drawEndCircles('red'); // 红色
      // }
    },

    throttle: function(func, delay, mustRun) { // 节流函数
      var timer, startTime = new Date(),
        self = this;
      return function(e) {
        //self.wantdo ++;

        /* 修复一个 bug，由于延迟导致的 preventDefault 失效 */
        if (e) {
          e.preventDefault ? e.preventDefault() : null;
          e.stopPropagation ? e.stopPropagation() : null;
        }
        var curTime = new Date(),
          args = arguments;
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


    drawCircles: function() { // 画所有圆
      this.ctx.clearRect(0, 0, this.width, this.width); // 清空画布，为了防止重复画
      for (var i = 0; i < this.circles.length; i++) {
        this.drawCircle(this.circles[i].x, this.circles[i].y);
      }
    },

    drawCircle: function(x, y, color) { // 画圆
      this.ctx.strokeStyle = color || this.color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.r, 0, Math.PI * 2, true); //0~2PI顺时针画圆弧
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fill();
      this.ctx.closePath();
      this.ctx.stroke();
    },

    drawEndCircles: function(color) { // end 时重绘已经 touch 的圆
      for (var i = 0; i < this.touchCircles.length; i++) {
        this.drawCircle(this.touchCircles[i].x, this.touchCircles[i].y, color);
      }
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
        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(xn1, yn1);
        this.ctx.lineTo(xn2, yn2);
        this.ctx.stroke();
        this.ctx.closePath();
      }
    },

    drawLine2TouchPos: function(p) {
      var len = this.touchCircles.length;
      if (len >= 1) {
        // debugger;
        this.ctx2.clearRect(0, 0, this.width, this.width); // 先清空
        this.ctx2.beginPath();
        this.ctx2.lineWidth = 3;
        this.ctx2.moveTo(this.touchCircles[len - 1].x, this.touchCircles[len - 1].y);
        this.ctx2.lineTo(p.x, p.y);
        this.ctx2.stroke();
        this.ctx2.closePath();

      }
    },

    drawPoints: function() { // 画实心圆(点)
      var i = this.touchCircles.length - 1;
      if (i >= 0) {
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.touchCircles[i].x, this.touchCircles[i].y, this.r / 3, 0, Math.PI * 2, true);
        this.ctx.closePath();
        this.ctx.fill();
      }
    },

    reset: function() { // 重置 canvas
      this.drawCircles();
      this.ctx2.clearRect(0, 0, this.width, this.width);
    },

    showInfo: function(infoText) {
      var info = this.info,
        step = 0;

      info.style.color = "red";
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

    showMessage: function(messageText, timer) { // 专门用来显示提示信息
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