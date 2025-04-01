// 필터링 기능 업데이트
document.addEventListener("DOMContentLoaded", function () {
  const filterButtons = document.querySelectorAll(".tag-btn");
  const aiCategories = document.querySelectorAll(".ai-category");

  // 필터링 기능
  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // 활성화된 버튼 스타일 업데이트
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      const filter = this.getAttribute("data-filter");

      // 카테고리 표시/숨김 처리
      aiCategories.forEach((category) => {
        const categoryType = category.getAttribute("data-category");

        if (filter === "all") {
          category.classList.remove("hidden");
        } else if (categoryType === filter) {
          category.classList.remove("hidden");
        } else {
          category.classList.add("hidden");
        }
      });
    });
  });

  // 뷰 전환 기능
  const viewButtons = document.querySelectorAll(".view-btn");
  const toolGrids = document.querySelectorAll(".tool-grid");

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // 활성화된 버튼 스타일 업데이트
      viewButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const viewType = button.getAttribute("data-view");

      // 그리드 뷰 설정
      toolGrids.forEach((grid) => {
        if (viewType === "grid") {
          grid.classList.remove("list-view");
        } else if (viewType === "list") {
          grid.classList.add("list-view");
        }
      });

      // 사용자 뷰 선택 저장
      localStorage.setItem("preferred-view", viewType);
    });
  });

  // 저장된 사용자 뷰 선택 불러오기
  const savedView = localStorage.getItem("preferred-view");
  if (savedView) {
    const viewButtonToActivate = document.querySelector(
      `.view-btn[data-view="${savedView}"]`
    );
    if (viewButtonToActivate) {
      viewButtonToActivate.click();
    }
  }

  // 도구 정렬 기능
  const sortSelect = document.getElementById("sort-tools");

  function sortTools(sortValue) {
    aiCategories.forEach((category) => {
      const toolGrid = category.querySelector(".tool-grid");
      const tools = Array.from(toolGrid.querySelectorAll(".tool-card"));

      tools.sort((a, b) => {
        const titleA = a.querySelector("h4").textContent.trim();
        const titleB = b.querySelector("h4").textContent.trim();

        switch (sortValue) {
          case "name-asc":
            return titleA.localeCompare(titleB, "ko");
          case "name-desc":
            return titleB.localeCompare(titleA, "ko");
          case "date-desc":
            const dateA =
              a.querySelector(".tool-update-date")?.textContent.trim() ||
              "0000.00";
            const dateB =
              b.querySelector(".tool-update-date")?.textContent.trim() ||
              "0000.00";
            return dateB.localeCompare(dateA);
          case "popular":
            // 인기순은 구현이 필요할 경우 여기에 작성
            return 0;
          default:
            return 0;
        }
      });

      // 정렬된 도구들 다시 추가
      tools.forEach((tool) => toolGrid.appendChild(tool));
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      sortTools(this.value);

      // 사용자 정렬 선택 저장
      localStorage.setItem("preferred-sort", this.value);
    });

    // 저장된 사용자 정렬 선택 불러오기
    const savedSort = localStorage.getItem("preferred-sort");
    if (savedSort) {
      sortSelect.value = savedSort;
      sortTools(savedSort);
    }
  }

  // 템플릿 프롬프트 변수 처리 개선
  const promptContents = document.querySelectorAll(
    '.prompt-content[data-variables="true"]'
  );

  promptContents.forEach((content) => {
    if (!content) return;

    try {
      // 원본 텍스트 저장
      const originalText = content.textContent;

      // {{변수명}} 패턴 찾아서 span으로 감싸기 및 변수 수 체크
      const variablePattern = /\{\{([^}]+)\}\}/g;
      const variables = [];
      let match;

      while ((match = variablePattern.exec(originalText)) !== null) {
        variables.push(match[1]);
      }

      // 변수 수에 따른 클래스 추가
      if (variables.length > 0) {
        content.closest(".template-prompt")?.classList.add("has-variables");
        content.setAttribute("data-variable-count", variables.length);
      }

      const highlightedText = originalText.replace(
        /\{\{([^}]+)\}\}/g,
        '<span class="variable-token" data-variable-name="$1">{{$1}}</span>'
      );

      // 변경된 내용 적용
      if (highlightedText !== originalText) {
        content.innerHTML = highlightedText;
      }
    } catch (error) {
      console.error("변수 하이라이팅 처리 오류:", error);
    }
  });

  const templatePrompts = document.querySelectorAll(".template-prompt");

  templatePrompts.forEach((prompt) => {
    const applyButton = prompt.querySelector(".apply-variables-btn");
    const copyButton = prompt.querySelector(".copy-btn");
    const contentElement = prompt.querySelector(".prompt-content");

    // 원본 텍스트 저장 (트리밍 및 공백 정리)
    let promptContent = "";
    if (contentElement) {
      promptContent = contentElement.innerText || contentElement.textContent;
      promptContent = promptContent.trim().replace(/\s+/g, " ");
    }

    const inputs = prompt.querySelectorAll(".var-input");
    const userPromptInput = document.getElementById("userPrompt");

    // 변수 적용 버튼 클릭 이벤트 개선
    if (applyButton) {
      applyButton.addEventListener("click", () => {
        try {
          // 변수가 없는 경우 처리
          if (!promptContent || promptContent.length === 0) {
            showToast("템플릿 내용이 없습니다.", "error");
            return;
          }

          let result = promptContent;
          let replacementsMade = false;
          let missingVariables = [];

          // 변수 토큰 강조 표시를 위한 원본 HTML 저장
          if (contentElement && !prompt.getAttribute("data-original-content")) {
            prompt.setAttribute(
              "data-original-content",
              contentElement.innerHTML
            );
          }

          // 각 입력 필드에 대해 변수 패턴 찾아 대체
          inputs.forEach((input) => {
            const varValue = input.value.trim();
            const label = input.previousElementSibling
              ? input.previousElementSibling.textContent.trim()
              : "";

            // 중괄호 제거 후 변수명만 추출
            const varName = label.replace(/[{}]/g, "").trim();

            if (!varValue && varName) {
              missingVariables.push(varName);
            }

            if (varName) {
              // 변수 패턴 생성 및 대체
              const varPattern = new RegExp(`{{${varName}}}`, "g");
              const newResult = result.replace(varPattern, varValue);

              // 대체가 발생했는지 확인
              if (newResult !== result) {
                replacementsMade = true;
                result = newResult;
              }
            }
          });

          // 누락된 변수가 있는 경우 사용자에게 알림
          if (missingVariables.length > 0) {
            showToast(
              `누락된 변수가 있습니다: ${missingVariables.join(", ")}`,
              "warning"
            );
            return;
          }

          // 변수 대체가 없는 경우 알림
          if (!replacementsMade) {
            showToast(
              "변수 대체가 이루어지지 않았습니다. 입력값을 확인하세요.",
              "warning"
            );
            return;
          }

          // 처리된 결과 저장
          prompt.setAttribute("data-processed-prompt", result);

          // 결과를 사용자 입력창에 적용
          if (userPromptInput) {
            userPromptInput.value = result;
            userPromptInput.focus();

            try {
              // 텍스트 영역 자동 크기 조정
              userPromptInput.style.height = "auto";
              userPromptInput.style.height =
                userPromptInput.scrollHeight + "px";

              // 입력창으로 스크롤
              userPromptInput.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            } catch (e) {
              console.error("스크롤 또는 크기 조정 오류:", e);
            }

            // 성공 피드백 추가
            userPromptInput.classList.add("highlight-pulse");
            setTimeout(() => {
              userPromptInput.classList.remove("highlight-pulse");
            }, 1000);

            showToast("프롬프트가 입력창에 적용되었습니다.", "success");
          } else {
            showToast("입력창을 찾을 수 없습니다.", "error");
          }
        } catch (error) {
          console.error("변수 적용 오류:", error);
          showToast("변수 적용 중 오류가 발생했습니다.", "error");
        }
      });
    }

    // 변수 입력 필드에 엔터 키 이벤트 추가
    inputs.forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && applyButton) {
          e.preventDefault();
          applyButton.click();
        }
      });
    });

    // 복사 버튼 클릭 이벤트
    if (copyButton) {
      copyButton.addEventListener("click", () => {
        // 변수 적용된 내용이 있는지 확인
        const processedPrompt = prompt.getAttribute("data-processed-prompt");
        const textToCopy = processedPrompt || promptContent;

        // 클립보드에 복사
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            showToast("프롬프트가 클립보드에 복사되었습니다.", "success");

            // 복사 성공 시 잠시 버튼 스타일 변경으로 피드백 제공
            copyButton.classList.add("copy-success");
            setTimeout(() => {
              copyButton.classList.remove("copy-success");
            }, 1000);
          })
          .catch((err) => {
            showToast("복사 중 오류가 발생했습니다.", "error");
            console.error("클립보드 복사 실패:", err);
          });
      });
    }

    // 프롬프트 내용 더블클릭 시 원본으로 복원
    if (contentElement) {
      contentElement.addEventListener("dblclick", () => {
        const originalContent = prompt.getAttribute("data-original-content");
        if (originalContent) {
          contentElement.innerHTML = originalContent;
          prompt.removeAttribute("data-processed-prompt");
          prompt.removeAttribute("data-original-content");
          showToast("원본 프롬프트로 복원되었습니다.", "info");
        }
      });
    }
  });

  // 추천 프롬프트 클릭 기능 개선
  const promptItems = document.querySelectorAll(".prompt-item");
  const userPromptInput = document.getElementById("userPrompt");

  if (promptItems.length > 0 && userPromptInput) {
    promptItems.forEach((item) => {
      item.addEventListener("click", function () {
        const promptText = this.getAttribute("data-prompt");
        if (!promptText) {
          console.error("프롬프트 텍스트를 찾을 수 없습니다.");
          showToast("프롬프트 텍스트를 찾을 수 없습니다.", "error");
          return;
        }

        // 입력창에 프롬프트 텍스트 설정
        userPromptInput.value = promptText;
        userPromptInput.focus();

        // 입력창 높이 자동 조정 (필요한 경우)
        userPromptInput.style.height = "auto";
        userPromptInput.style.height = userPromptInput.scrollHeight + "px";

        // 스크롤 이동 개선
        try {
          const aiSection = document.getElementById("ai-section");
          if (aiSection) {
            aiSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

            // 시각적 피드백 - 입력창 깜빡임 효과
            userPromptInput.classList.add("highlight-pulse");
            setTimeout(() => {
              userPromptInput.classList.remove("highlight-pulse");
            }, 1000);
          }
        } catch (e) {
          console.error("스크롤 이동 중 오류:", e);
        }

        showToast("프롬프트가 입력창에 적용되었습니다.", "success");
      });
    });
  }

  // 검색 기능 강화
  const searchInput = document.querySelector(".search-input");
  const searchResults = document.querySelector(".search-results");
  let searchTimeout = null;

  if (searchInput && searchResults) {
    console.log("검색 입력 필드와 결과 컨테이너 초기화 완료:", {
      searchInput: !!searchInput,
      searchResults: !!searchResults,
    });

    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      console.log("검색 쿼리 입력됨:", query);

      // 이전 타이머 취소
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // 짧은 검색어는 딜레이 후 처리 (성능 최적화)
      if (query.length < 2) {
        searchResults.classList.remove("active");
        return;
      }

      // 타이핑 중 지연 검색 (디바운싱)
      searchTimeout = setTimeout(() => {
        console.log("검색 실행:", query);
        performSearch(query);
      }, 300);
    });

    function performSearch(query) {
      try {
        console.log("검색 함수 실행됨:", query);
        // 검색 결과 컨테이너 비우기
        searchResults.innerHTML = "";

        // 로딩 표시 추가
        const loadingIndicator = document.createElement("div");
        loadingIndicator.className = "search-loading";
        loadingIndicator.textContent = "검색 중...";
        searchResults.appendChild(loadingIndicator);
        searchResults.classList.add("active");

        // 비동기 검색 프로세스 시뮬레이션
        setTimeout(() => {
          // 로딩 표시 제거
          searchResults.removeChild(loadingIndicator);

          // 모든 AI 도구 카드 검색
          const allToolCards = document.querySelectorAll(".tool-card");
          console.log("검색 대상 카드 수:", allToolCards.length);
          let resultsFound = false;
          let resultsCount = 0;
          const maxResults = 10; // 최대 결과 수 제한

          allToolCards.forEach((card) => {
            if (resultsCount >= maxResults) return;

            const title = card.querySelector("h4").textContent.toLowerCase();
            const description = card
              .querySelector("p")
              .textContent.toLowerCase();
            const link = card.getAttribute("href");

            // 카테고리 정보 가져오기
            const category = card.closest(".ai-category");
            const categoryTitle = category
              ? category.querySelector(".category-title").textContent.trim()
              : "";
            const categoryType = category
              ? category.getAttribute("data-category")
              : "";

            // 검색 관련성 점수 계산 (간단한 알고리즘)
            let relevance = 0;

            // 제목 일치는 높은 가중치
            if (title.includes(query)) {
              relevance += 10;
              // 제목 시작 부분 일치는 더 높은 가중치
              if (title.startsWith(query)) {
                relevance += 5;
              }
            }

            // 설명 일치
            if (description.includes(query)) {
              relevance += 5;
            }

            // 카테고리 일치
            if (categoryTitle.toLowerCase().includes(query)) {
              relevance += 3;
            }

            // 일치하는 항목이 있으면 결과 표시
            if (relevance > 0) {
              resultsFound = true;
              resultsCount++;
              console.log("검색 결과 매치됨:", title, "관련성:", relevance);

              // 검색 결과 아이템 생성
              const resultItem = document.createElement("div");
              resultItem.className = "search-result-item";
              resultItem.setAttribute("data-category", categoryType);
              resultItem.setAttribute("data-relevance", relevance);

              // 결과 아이템 클릭 시 해당 도구로 이동
              resultItem.addEventListener("click", () => {
                // 클릭 애니메이션 효과 추가
                resultItem.classList.add("clicked");
                setTimeout(() => {
                  window.open(link, "_blank");
                }, 200);
              });

              // 카테고리 라벨 생성
              const categoryLabel = document.createElement("div");
              categoryLabel.className = "search-result-category";
              categoryLabel.textContent = categoryTitle;

              // 제목과 설명 추가 - 검색어 하이라이트
              const resultTitle = document.createElement("div");
              resultTitle.className = "search-result-title";
              resultTitle.innerHTML = highlightSearchTerm(
                title.charAt(0).toUpperCase() + title.slice(1),
                query
              );

              const resultDescription = document.createElement("div");
              resultDescription.className = "search-result-description";
              resultDescription.innerHTML = highlightSearchTerm(
                description,
                query
              );

              // 요소 추가
              resultItem.appendChild(categoryLabel);
              resultItem.appendChild(resultTitle);
              resultItem.appendChild(resultDescription);
              searchResults.appendChild(resultItem);
            }
          });

          // 검색 결과가 없는 경우 메시지 표시
          if (!resultsFound) {
            console.log("검색 결과 없음");
            const noResults = document.createElement("div");
            noResults.className = "search-no-results";
            noResults.textContent = "검색 결과가 없습니다.";
            searchResults.appendChild(noResults);
          } else if (resultsCount >= maxResults) {
            // 최대 결과 수 도달 시 메시지 추가
            console.log("최대 결과 수 도달");
            const moreResults = document.createElement("div");
            moreResults.className = "search-more-results";
            moreResults.textContent =
              "더 많은 결과가 있습니다. 검색어를 구체적으로 입력해주세요.";
            searchResults.appendChild(moreResults);
          }
        }, 300);
      } catch (error) {
        console.error("검색 오류:", error);
        searchResults.innerHTML =
          "<div class='search-error'>검색 중 오류가 발생했습니다.</div>";
      }
    }

    // 검색어 하이라이트 함수
    function highlightSearchTerm(text, term) {
      if (!term) return text;

      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedTerm})`, "gi");
      return text.replace(regex, "<mark>$1</mark>");
    }

    // 검색창 외부 클릭 시 결과 닫기
    document.addEventListener("click", function (event) {
      if (
        !searchInput.contains(event.target) &&
        !searchResults.contains(event.target)
      ) {
        searchResults.classList.remove("active");
      }
    });

    // ESC 키 누르면 검색 결과 닫기
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchResults.classList.remove("active");
        searchInput.value = "";
        // 포커스 해제
        searchInput.blur();
      }
    });
  }

  // 토스트 메시지 표시 함수 개선
  function showToast(message, type = "info") {
    // 토스트 표시 횟수 제한 (한 화면에 동시에 최대 3개로 제한)
    const existingToasts = document.querySelectorAll(".toast");
    if (existingToasts.length >= 3) {
      existingToasts[0].remove(); // 가장 오래된 토스트 제거
    }

    // 새 토스트 생성
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");

    // 아이콘 설정
    let icon = "";
    switch (type) {
      case "success":
        icon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        break;
      case "error":
        icon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        break;
      case "warning":
        icon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      default:
        icon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    // 토스트 내용 구성
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close">×</button>
    `;

    // 화면에 추가
    document.body.appendChild(toast);

    // 표시 애니메이션
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // 닫기 버튼 이벤트
    const closeButton = toast.querySelector(".toast-close");
    closeButton.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    });

    // 자동 사라짐
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);

    // 스크린 리더 지원 개선
    const srMessage = document.createElement("span");
    srMessage.className = "sr-only";
    srMessage.textContent = `${
      type === "success"
        ? "성공: "
        : type === "error"
        ? "오류: "
        : type === "warning"
        ? "경고: "
        : "알림: "
    }${message}`;
    toast.appendChild(srMessage);
  }

  // 다크모드 토글 기능
  const themeSwitch = document.getElementById("themeSwitch");
  const root = document.documentElement;

  // 시스템 다크모드 감지
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  // 저장된 테마 설정 불러오기
  const savedTheme =
    localStorage.getItem("theme") ||
    (prefersDarkScheme.matches ? "dark" : "light");

  // 초기 테마 설정
  root.setAttribute("data-theme", savedTheme);
  themeSwitch.checked = savedTheme === "dark";

  // 테마 토글 이벤트 리스너
  themeSwitch.addEventListener("change", function () {
    const newTheme = this.checked ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });

  // 시스템 테마 변경 감지
  prefersDarkScheme.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      const newTheme = e.matches ? "dark" : "light";
      root.setAttribute("data-theme", newTheme);
      themeSwitch.checked = e.matches;
    }
  });

  // 스크롤 진행 표시기 구현
  const scrollProgressBar = document.querySelector(".scroll-progress");

  if (scrollProgressBar) {
    // 스크롤 이벤트 처리
    window.addEventListener("scroll", () => {
      // 전체 페이지 높이 계산 (스크롤할 수 있는 최대 높이)
      const totalHeight = document.body.scrollHeight - window.innerHeight;

      // 현재 스크롤 위치
      const scrollPosition = window.pageYOffset;

      // 진행률 계산 (퍼센트)
      const scrollPercentage = (scrollPosition / totalHeight) * 100;

      // 진행 표시기 너비 업데이트
      scrollProgressBar.style.width = `${scrollPercentage}%`;
    });
  }

  // Ripple effect for buttons
  function createRippleEffect() {
    const buttons = document.querySelectorAll(
      ".mgmt-button, .search-button, .tag-btn, .view-btn, .prompt-item"
    );

    buttons.forEach((button) => {
      button.addEventListener("click", function (e) {
        // 이미 ripple 요소가 있으면 제거
        const existingRipple = this.querySelector(".ripple");
        if (existingRipple) {
          existingRipple.remove();
        }

        // 새 ripple 요소 생성
        const ripple = document.createElement("span");
        ripple.classList.add("ripple");
        this.appendChild(ripple);

        // 클릭 위치 계산
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        // Ripple 요소 위치 및 크기 설정
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        // 애니메이션 완료 후 ripple 요소 제거
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // Ripple effect 초기화
  createRippleEffect();

  // Ripple animation 스타일 추가
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    .ripple {
      position: absolute;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // 맨 위로 버튼 기능
  const backToTopButton = document.getElementById("backToTopBtn");

  if (backToTopButton) {
    // 스크롤 이벤트에 따라 버튼 표시/숨김
    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 300) {
        backToTopButton.classList.add("visible");
      } else {
        backToTopButton.classList.remove("visible");
      }
    });

    // 클릭 시 맨 위로 스크롤
    backToTopButton.addEventListener("click", () => {
      // 부드러운 스크롤 지원 확인
      if ("scrollBehavior" in document.documentElement.style) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else {
        // 호환성을 위한 폴백
        window.scrollTo(0, 0);
      }

      // 버튼에 애니메이션 효과 추가
      backToTopButton.classList.add("active");
      setTimeout(() => {
        backToTopButton.classList.remove("active");
      }, 300);
    });
  }

  // 클립보드 관리 유틸리티 추가
  class ClipboardManager {
    static async copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error("클립보드 복사 실패:", error);
        return false;
      }
    }
  }

  // 모달 관리 유틸리티 추가
  class ModalManager {
    constructor() {
      this.modal = null;
      this.handleEscape = this.handleEscape.bind(this);
    }

    show(content) {
      this.hide();

      // 모달 요소 생성
      this.modal = document.createElement("div");
      this.modal.className = "modal";
      this.modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-container">${content}</div>
        </div>
      `;
      document.body.appendChild(this.modal);

      // 모달 활성화를 위한 타이밍 조정
      setTimeout(() => {
        const overlay = this.modal.querySelector(".modal-overlay");
        overlay.classList.add("active");
        this.modal.classList.add("active");
      }, 10);

      // 이벤트 리스너 추가
      const overlay = this.modal.querySelector(".modal-overlay");
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.hide();
      });
      document.addEventListener("keydown", this.handleEscape);
    }

    hide() {
      if (this.modal) {
        const overlay = this.modal.querySelector(".modal-overlay");
        overlay.classList.remove("active");
        this.modal.classList.remove("active");

        // 페이드 아웃 애니메이션을 위한 지연
        setTimeout(() => {
          document.removeEventListener("keydown", this.handleEscape);
          this.modal.remove();
          this.modal = null;
        }, 300); // CSS 트랜지션과 동일한 시간
      }
    }

    handleEscape(e) {
      if (e.key === "Escape") this.hide();
    }
  }

  // AI 서비스 모달 표시 함수 추가
  function showAIServicesModal(promptText, modalManager) {
    const services = [
      {
        name: "Perplexity AI",
        url: `https://www.perplexity.ai/search?q=${encodeURIComponent(
          promptText
        )}`,
        hasPrompt: true,
      },
      {
        name: "Felo AI",
        url: `https://felo.ai/en/search?q=${encodeURIComponent(promptText)}`,
        hasPrompt: true,
      },
      {
        name: "Genspark",
        url: `https://www.genspark.ai/search?query=${encodeURIComponent(
          promptText
        )}`,
        hasPrompt: true,
      },
      {
        name: "ChatGPT",
        url: "https://chat.openai.com/",
        hasPrompt: false,
      },
      {
        name: "Google Gemini",
        url: "https://gemini.google.com/",
        hasPrompt: false,
      },
      {
        name: "Claude",
        url: "https://claude.ai/new",
        hasPrompt: false,
      },
      {
        name: "DeepSeek",
        url: "https://chat.deepseek.com/",
        hasPrompt: false,
      },
      {
        name: "Grok",
        url: "https://grok.x.ai",
        hasPrompt: false,
      },
    ];

    const modalContent = `
      <div class="response-card">
        <h3>각 AI 서비스로 이동하기</h3>
        <p>프롬프트가 클립보드에 복사되었습니다.</p>
        <div class="button-container">
          ${services
            .map(
              (service) => `
            <a href="${service.url}"
               target="_blank"
               class="ai-service-button ${
                 service.hasPrompt ? "has-prompt" : ""
               }"
               rel="noopener noreferrer">
              ${service.name}에서 검색
              ${
                service.hasPrompt
                  ? '<span class="prompt-indicator">🔗</span>'
                  : ""
              }
            </a>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    modalManager.show(modalContent);
  }

  // 모달 매니저 인스턴스 생성
  const modalManager = new ModalManager();

  // AI 챗봇 문의하기 기능 추가
  const submitBtn = document.getElementById("submitBtn");

  if (submitBtn && userPromptInput) {
    submitBtn.addEventListener("click", async () => {
      const text = userPromptInput.value.trim();

      if (!text) {
        showToast("📝 프롬프트를 입력하세요", "warning");
        return;
      }

      try {
        const copied = await ClipboardManager.copyText(text);
        if (copied) {
          showAIServicesModal(text, modalManager);
        } else {
          throw new Error("클립보드 복사 실패");
        }
      } catch (error) {
        console.error("AI 챗봇 에러:", error);
        showToast("처리 중 오류가 발생했습니다.", "error");
      }
    });

    // 엔터 키 이벤트
    userPromptInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitBtn.click();
      }
    });
  }

  // 맞춤법 검사하기 기능 추가
  const spellCheckPrompt = document.getElementById("spellCheckPrompt");
  const spellCheckBtn = document.getElementById("spellCheckBtn");

  if (spellCheckBtn && spellCheckPrompt) {
    spellCheckBtn.addEventListener("click", async () => {
      const text = spellCheckPrompt.value.trim();
      if (!text) {
        showToast("맞춤법을 검사할 내용을 입력하세요.", "warning");
        return;
      }

      try {
        const copied = await ClipboardManager.copyText(text);
        if (copied) {
          window.open("https://dic.daum.net/grammar_checker.do", "_blank");
          modalManager.show(`
            <div class="response-card">
              <h3>맞춤법 검사</h3>
              <p>텍스트가 클립보드에 복사되었습니다. 새 창에서 Ctrl+V(⌘+V)를 눌러 붙여넣기 해주세요.</p>
            </div>
          `);
        } else {
          throw new Error("클립보드 복사 실패");
        }
      } catch (error) {
        console.error("맞춤법 검사 에러:", error);
        showToast(
          "클립보드 복사에 실패했습니다. 수동으로 복사해주세요.",
          "error"
        );
      }
    });
  }

  // 히스토리 관리 기능 개선
  class HistoryManager {
    constructor() {
      this.historyContainer = document.querySelector(".history-container");
      this.clearHistoryBtn = document.querySelector(".clear-history-btn");
      this.userPromptInput = document.getElementById("userPrompt");
      this.submitBtn = document.getElementById("submitBtn");
      this.maxHistoryItems = 10;
      this.history = this.loadHistory();

      if (this.submitBtn && this.userPromptInput) {
        this.setupEventListeners();
        this.renderHistory();
      }
    }

    setupEventListeners() {
      if (this.clearHistoryBtn) {
        this.clearHistoryBtn.addEventListener("click", () => {
          this.clearHistory();
        });
      }

      this.submitBtn.addEventListener("click", () => {
        const query = this.userPromptInput.value.trim();
        if (query) {
          this.addToHistory(query);
        }
      });
    }

    loadHistory() {
      try {
        const stored = localStorage.getItem("queryHistory");
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("히스토리 로드 오류:", error);
        return [];
      }
    }

    saveHistory() {
      try {
        localStorage.setItem("queryHistory", JSON.stringify(this.history));
      } catch (error) {
        console.error("히스토리 저장 오류:", error);
      }
    }

    addToHistory(query) {
      const existingIndex = this.history.findIndex(
        (item) => item.query === query
      );
      if (existingIndex !== -1) {
        this.history.splice(existingIndex, 1);
      }

      const historyItem = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toISOString(),
      };

      this.history.unshift(historyItem);

      if (this.history.length > this.maxHistoryItems) {
        this.history = this.history.slice(0, this.maxHistoryItems);
      }

      this.saveHistory();
      this.renderHistory();
    }

    clearHistory() {
      this.history = [];
      this.saveHistory();
      this.renderHistory();
    }

    removeHistoryItem(id) {
      this.history = this.history.filter((item) => item.id !== id);
      this.saveHistory();
      this.renderHistory();
    }

    reuseQuery(query) {
      if (this.userPromptInput) {
        this.userPromptInput.value = query;
        this.userPromptInput.focus();

        const aiSection = document.getElementById("ai-section");
        if (aiSection) {
          aiSection.scrollIntoView({ behavior: "smooth" });
        }
      }
    }

    formatDate(isoString) {
      const date = new Date(isoString);
      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    renderHistory() {
      if (!this.historyContainer) return;

      this.historyContainer.innerHTML = "";

      if (this.history.length === 0) {
        this.historyContainer.innerHTML = `
          <p class="no-history-message">아직 히스토리가 없습니다.</p>
        `;
        return;
      }

      this.history.forEach((item) => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        historyItem.innerHTML = `
          <div class="history-timestamp">${this.formatDate(
            item.timestamp
          )}</div>
          <div class="history-query">${this.escapeHTML(item.query)}</div>
          <div class="history-actions">
            <button class="remove-history-btn" data-id="${item.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <button class="reuse-query-btn" data-query="${this.escapeHTML(
              item.query
            )}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 15v4c0 1.1.9 2 2 2h4M21 9V5c0-1.1-.9-2-2-2h-4"></path>
                <path d="M9 21H5c-1.1 0-2-.9-2-2v-4"></path>
                <path d="M15 3h4c1.1 0 2 .9 2 2v4"></path>
              </svg>
            </button>
          </div>
        `;

        const removeBtn = historyItem.querySelector(".remove-history-btn");
        removeBtn.addEventListener("click", () => {
          this.removeHistoryItem(item.id);
        });

        const reuseBtn = historyItem.querySelector(".reuse-query-btn");
        reuseBtn.addEventListener("click", () => {
          this.reuseQuery(item.query);
        });

        this.historyContainer.appendChild(historyItem);
      });
    }

    escapeHTML(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  }

  // 히스토리 매니저 초기화
  const historyManager = new HistoryManager();

  // CustomPromptManager 클래스 추가
  class CustomPromptManager {
    constructor() {
      console.log("CustomPromptManager 초기화 시작");

      // DOM 요소 가져오기 전에 존재하는지 확인
      if (!document.getElementById("customPromptsList")) {
        console.error("customPromptsList 요소가 존재하지 않습니다");
      }

      if (!document.getElementById("saveCustomPrompt")) {
        console.error("saveCustomPrompt 버튼이 존재하지 않습니다");
      }

      this.customPromptsList = document.getElementById("customPromptsList");
      this.saveCustomPromptBtn = document.getElementById("saveCustomPrompt");
      this.customPromptTitleInput =
        document.getElementById("customPromptTitle");
      this.customPromptTextInput = document.getElementById("customPromptText");
      this.userPromptInput = document.getElementById("userPrompt");

      // localStorage 테스트
      try {
        localStorage.setItem("test", "test");
        localStorage.removeItem("test");
        console.log("localStorage 작동 확인 완료");
      } catch (e) {
        console.error("localStorage 접근 오류:", e);
      }

      this.customPrompts = this.loadCustomPrompts();

      console.log("DOM 요소 참조:", {
        customPromptsList: !!this.customPromptsList,
        saveCustomPromptBtn: !!this.saveCustomPromptBtn,
        customPromptTitleInput: !!this.customPromptTitleInput,
        customPromptTextInput: !!this.customPromptTextInput,
        userPromptInput: !!this.userPromptInput,
      });

      // 이벤트 설정 및 렌더링
      this.setupEventListeners();
      this.renderCustomPrompts();
      console.log("CustomPromptManager 초기화 완료");
    }

    setupEventListeners() {
      console.log("이벤트 리스너 설정 시작");

      // 먼저 기존 이벤트 리스너 제거 (중복 방지)
      if (this.saveCustomPromptBtn) {
        this.saveCustomPromptBtn.removeEventListener(
          "click",
          this._saveHandler
        );

        // 바인딩된 이벤트 핸들러 저장
        this._saveHandler = (e) => {
          console.log("저장 버튼 클릭됨!");
          e.preventDefault();
          this.saveCustomPrompt();
        };

        // 새 이벤트 핸들러 등록
        this.saveCustomPromptBtn.addEventListener("click", this._saveHandler);
        console.log("저장 버튼에 이벤트 핸들러 등록 완료");

        // 인라인 확인을 위한 테스트
        this.saveCustomPromptBtn.onclick = (e) => {
          console.log("인라인 onclick 이벤트 발생!");
        };
      } else {
        console.error("saveCustomPromptBtn을 찾을 수 없습니다.");
      }

      console.log("이벤트 리스너 설정 완료");
    }

    loadCustomPrompts() {
      try {
        const stored = localStorage.getItem("customPrompts");
        console.log("저장된 프롬프트 데이터:", stored);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("프롬프트 로드 중 오류:", error);
        return [];
      }
    }

    saveCustomPrompts() {
      try {
        console.log("프롬프트 저장 시도:", this.customPrompts);
        localStorage.setItem(
          "customPrompts",
          JSON.stringify(this.customPrompts)
        );
        console.log("프롬프트 저장 완료");
        return true;
      } catch (error) {
        console.error("프롬프트 저장 중 오류:", error);
        return false;
      }
    }

    saveCustomPrompt() {
      console.log("saveCustomPrompt 함수 실행됨");

      try {
        // DOM 요소 다시 확인
        if (!this.customPromptTitleInput) {
          this.customPromptTitleInput =
            document.getElementById("customPromptTitle");
        }

        if (!this.customPromptTextInput) {
          this.customPromptTextInput =
            document.getElementById("customPromptText");
        }

        if (!this.customPromptTitleInput || !this.customPromptTextInput) {
          throw new Error("필수 입력 필드를 찾을 수 없습니다.");
        }

        const title = this.customPromptTitleInput.value.trim();
        const text = this.customPromptTextInput.value.trim();

        console.log("입력된 값:", { title, text });

        if (!title || !text) {
          alert("제목과 내용을 모두 입력해주세요.");
          return;
        }

        // 새 프롬프트 추가
        const newPrompt = {
          id: Date.now(),
          title,
          text,
          createdAt: new Date().toISOString(),
        };

        console.log("새 프롬프트 생성:", newPrompt);

        // 기존 배열이 없으면 새로 생성
        if (!Array.isArray(this.customPrompts)) {
          console.log("customPrompts가 배열이 아니어서 새로 초기화합니다");
          this.customPrompts = [];
        }

        this.customPrompts.push(newPrompt);

        if (this.saveCustomPrompts()) {
          // 입력 필드 초기화
          this.customPromptTitleInput.value = "";
          this.customPromptTextInput.value = "";

          // 프롬프트 목록 다시 렌더링
          this.renderCustomPrompts();

          // 성공 메시지 표시
          alert("프롬프트가 성공적으로 저장되었습니다.");
        } else {
          throw new Error("프롬프트 저장에 실패했습니다.");
        }
      } catch (error) {
        console.error("프롬프트 저장 중 오류:", error);
        alert("프롬프트 저장에 실패했습니다. 다시 시도해주세요.");
      }
    }

    deleteCustomPrompt(id) {
      try {
        this.customPrompts = this.customPrompts.filter(
          (item) => item.id !== id
        );
        if (this.saveCustomPrompts()) {
          this.renderCustomPrompts();
        } else {
          throw new Error("프롬프트 삭제에 실패했습니다.");
        }
      } catch (error) {
        console.error("프롬프트 삭제 중 오류:", error);
        alert("프롬프트 삭제에 실패했습니다. 다시 시도해주세요.");
      }
    }

    useCustomPrompt(text) {
      if (this.userPromptInput) {
        this.userPromptInput.value = text;
        this.userPromptInput.focus();
        // 유저 프롬프트 입력 필드로 스크롤
        document
          .getElementById("ai-section")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        console.error("userPromptInput을 찾을 수 없습니다.");
      }
    }

    renderCustomPrompts() {
      if (!this.customPromptsList) {
        console.error("customPromptsList를 찾을 수 없습니다.");
        return;
      }

      this.customPromptsList.innerHTML = "";

      if (this.customPrompts.length === 0) {
        this.customPromptsList.innerHTML = `
          <p class="no-custom-prompts">아직 저장된 프롬프트가 없습니다.</p>
        `;
        return;
      }

      this.customPrompts.forEach((prompt) => {
        const promptItem = document.createElement("div");
        promptItem.className = "custom-prompt-item";

        promptItem.innerHTML = `
          <div class="custom-prompt-header">
            <h5>${this.escapeHTML(prompt.title)}</h5>
            <button class="delete-prompt-btn" data-id="${
              prompt.id
            }" aria-label="프롬프트 삭제">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="custom-prompt-content">${this.escapeHTML(
            prompt.text
          )}</div>
          <div class="custom-prompt-actions">
            <button class="expand-prompt-btn">펼치기</button>
            <button class="use-prompt-btn" data-text="${this.escapeHTML(
              prompt.text
            )}">프롬프트 사용</button>
          </div>
        `;

        // 이벤트 리스너 설정
        const deleteBtn = promptItem.querySelector(".delete-prompt-btn");
        const useBtn = promptItem.querySelector(".use-prompt-btn");
        const expandBtn = promptItem.querySelector(".expand-prompt-btn");
        const contentElement = promptItem.querySelector(
          ".custom-prompt-content"
        );

        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            if (confirm("정말 이 프롬프트를 삭제하시겠습니까?")) {
              this.deleteCustomPrompt(prompt.id);
            }
          });
        }

        if (useBtn) {
          useBtn.addEventListener("click", () => {
            this.useCustomPrompt(prompt.text);
          });
        }

        if (expandBtn && contentElement) {
          expandBtn.addEventListener("click", () => {
            this.toggleExpand(contentElement, expandBtn);
          });
        }

        this.customPromptsList.appendChild(promptItem);
      });
    }

    toggleExpand(contentElement, expandBtn) {
      if (contentElement.classList.contains("expanded")) {
        contentElement.classList.remove("expanded");
        expandBtn.textContent = "펼치기";
      } else {
        contentElement.classList.add("expanded");
        expandBtn.textContent = "접기";
      }
    }

    // HTML 이스케이프 처리 (XSS 방지)
    escapeHTML(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  }

  // CustomPromptManager 초기화 - 여기서 직접 초기화합니다
  try {
    console.log("CustomPromptManager 초기화 시도");
    const customPromptManager = new CustomPromptManager();
  } catch (error) {
    console.error("CustomPromptManager 초기화 오류:", error);
  }
});

// 입력창 하이라이트 효과 스타일 추가
(function () {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes highlightPulse {
      0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(var(--primary-rgb), 0); }
      100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
    }
    
    .highlight-pulse {
      animation: highlightPulse 1s ease;
      border-color: var(--primary-color);
    }
  `;
  document.head.appendChild(style);
})();
