//<link href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.7.2/css/all.css" rel="stylesheet">
//<script src="https://raw.githubusercontent.com/hhnice510/Scripts/refs/heads/main/nice.js"></script> 

document.addEventListener('DOMContentLoaded', function () {
    const nice_btn = document.createElement("button");
    nice_btn.id = "suspendedButton";
    nice_btn.innerHTML = '<i class="fa-solid fa-bug"></i>';
    nice_btn.setAttribute("title", "NiceBox");

    nice_btn.setAttribute(
        "style",
        `
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        width: 48px;
        height: 48px;
        border-radius: 24px 0 0 24px;
        background: linear-gradient(145deg, #fbc2eb, #a18cd1);
        color: white;
        border: none;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        z-index: 9999;
        transition: all 0.2s ease;
        touch-action: none;
    `
    );

    document.body.appendChild(nice_btn);

    // 状态变量
    let isDragging = false;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let lastTouchX = 0;
    let isLeft = false;
    let autoHideTimer = null;

    function prepareForDrag() {
        const rect = nice_btn.getBoundingClientRect();
        nice_btn.style.top = `${rect.top}px`;
        nice_btn.style.left = `${rect.left}px`;
        nice_btn.style.right = "auto";
        nice_btn.style.transform = "none";
    }

    function startDrag(clientY, clientX) {
        clearTimeout(autoHideTimer);
        prepareForDrag();
        isDragging = true;
        offsetY = clientY - nice_btn.getBoundingClientRect().top;
        startX = clientX;
        startY = clientY;
        nice_btn.style.transition = "none";
        nice_btn.style.cursor = "grabbing";
        restoreButton(); // 拖动时还原
    }

    function doDrag(clientY) {
        const buttonHeight = nice_btn.offsetHeight;
        const maxTop = window.innerHeight - buttonHeight;
        let newTop = clientY - offsetY;
        newTop = Math.max(0, Math.min(newTop, maxTop));
        nice_btn.style.top = `${newTop}px`;
    }

    function endDrag(clientX) {
        isDragging = false;
        nice_btn.style.cursor = "grab";

        const buttonRect = nice_btn.getBoundingClientRect();
        const middleX = window.innerWidth / 2;

        const currentTop = buttonRect.top;
        nice_btn.style.top = `${currentTop}px`;

        isLeft = clientX < middleX;
        const start = buttonRect.left;
        const end = isLeft ? 0 : window.innerWidth - nice_btn.offsetWidth;

        const startTime = performance.now();
        const duration = 300;

        function animateFrame(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentX = start + (end - start) * ease;

            nice_btn.style.left = `${currentX}px`;
            nice_btn.style.right = "auto";
            nice_btn.style.transform = "none";

            // 设置圆角
            if (isLeft) {
                nice_btn.style.borderRadius = "0 24px 24px 0";
            } else {
                nice_btn.style.borderRadius = "24px 0 0 24px";
            }

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                bounceEffect();
                autoHide();
            }
        }

        requestAnimationFrame(animateFrame);
    }

    function bounceEffect() {
        nice_btn.style.transition = "transform 0.2s ease";
        nice_btn.style.transform = "scale(1.05)";
        setTimeout(() => {
            nice_btn.style.transform = "scale(1)";
        }, 200);
    }

    function autoHide() {
        autoHideTimer = setTimeout(() => {
            if (isLeft) {
                nice_btn.style.transform = "translateX(-50%)";
            } else {
                nice_btn.style.transform = "translateX(50%)";
            }
        }, 2000); // 2 秒后自动半隐藏
    }

    function restoreButton() {
        nice_btn.style.transform = "none";
    }

    // 鼠标拖动
    nice_btn.addEventListener("mousedown", function (e) {
        startDrag(e.clientY, e.clientX);
        moved = false;
        e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
        if (isDragging) {
            doDrag(e.clientY);
            if (Math.abs(e.clientY - startY) > 5) moved = true;
        }
    });

    document.addEventListener("mouseup", function (e) {
        if (isDragging) {
            endDrag(e.clientX);
        }
    });

    // 触摸拖动
    nice_btn.addEventListener("touchstart", function (e) {
        const touch = e.touches[0];
        startDrag(touch.clientY, touch.clientX);
        moved = false;
    });

    nice_btn.addEventListener("touchmove", function (e) {
        if (isDragging && e.touches.length === 1) {
            const touch = e.touches[0];
            doDrag(touch.clientY);
            lastTouchX = touch.clientX;
            if (Math.abs(touch.clientY - startY) > 5) moved = true;
        }
    });

    nice_btn.addEventListener("touchend", function () {
        if (isDragging) {
            endDrag(lastTouchX);
        }
    });

    // 鼠标悬停或触摸时自动恢复按钮
    nice_btn.addEventListener("mouseenter", () => {
        clearTimeout(autoHideTimer);
        restoreButton();
    });

    nice_btn.addEventListener("mouseleave", () => {
        autoHide(); // 鼠标移出后再次收缩
    });

    nice_btn.addEventListener("touchstart", () => {
        clearTimeout(autoHideTimer);
        restoreButton();
    });

    nice_btn.addEventListener("touchend", () => {
        autoHide();
    });

    // 点击事件
    nice_btn.addEventListener("click", function (e) {
        if (moved) {
            e.preventDefault();
            return;
        }
        console.log("按钮被点击！这里可以放切换语言、弹菜单等操作");
    });
});
