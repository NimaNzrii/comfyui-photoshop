disable_all_animations.addEventListener("change", (evt) => manageAnimation());

function manageAnimation() {
  if (!disable_all_animations.checked) {
    playanimation();
  } else {
    stopAnimations();
    sliderContainer.style.right = `8px`;
    buttonlist.style.left = `8px`;
    controlContainer_Background.style.bottom = `0px`;
  }
}

function stopAnimations() {
  gsap.killTweensOf(sliderContainer);
  gsap.killTweensOf(buttonlist);
  gsap.killTweensOf(controlContainer_Background);
}

function playanimation() {
  const animspeed = 0.35;
  let prevMouseStatus = false;
  let mouseInBody = false;
  let anim = true; // اضافه کردن این خط

  const animateElement = (element, properties) => {
    if (!disable_all_animations.checked) {
      gsap.to(element, { duration: animspeed, ease: "power2.out", ...properties });
    }
  };

  mainpanel.addEventListener("mousemove", ({ pageX, pageY }) => {
    const pageWidth = mainpanel.offsetWidth;
    const pageHeight = mainpanel.offsetHeight;
    const mouse_h = (pageY / pageHeight) * 100;
    const mouse_w = (pageX / pageWidth) * 100;

    const currentMouseStatus = mouse_w > 80 && mouse_h < 72;
    if (currentMouseStatus !== prevMouseStatus) {
      if (!never_hide_slider.checked) animateElement(sliderContainer, { right: currentMouseStatus ? 8 : -62 });
      prevMouseStatus = currentMouseStatus;
    }
  });

  body.addEventListener("mouseenter", () => {
    mouseInBody = true;
    if (anim) {
      if (never_hide_slider.checked) {
        animateElement(sliderContainer, { right: 8 });
      }
      animateElement(buttonlist, { left: 10 });
      animateElement(controlContainer_Background, { bottom: 0 });
    }
  });

  body.addEventListener("mouseleave", () => {
    mouseInBody = false;
    if (anim) {
      setTimeout(() => {
        if (!mouseInBody) {
          animateElement(buttonlist, { left: -60 });
          animateElement(controlContainer_Background, { bottom: -86 });
          animateElement(sliderContainer, { right: -62 });
        }
      }, 500);
    }
  });

  workFlowOptions.addEventListener("mouseenter", () => (anim = false));
  workFlowOptions.addEventListener("mouseleave", () => (anim = true));

  body.addEventListener("mouseleave", () => {
    anim = true;
    iconpreset.classList.remove("icon-preset-active");
    presetbtn.classList.remove("style-btn");

    iconprompt.classList.remove("icon-prompt-active");
    promptbtn.classList.remove("style-btn");

    promptContainer.classList.add("hidden");
    presetContainer.classList.add("hidden");
  });
}
