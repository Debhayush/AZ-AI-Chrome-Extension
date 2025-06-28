(function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("load", function () {
            try {
                if (this._url.includes("/problems/user/")) {
                    const res = JSON.parse(this.responseText);
                    const detail = res?.data;
                    if (!detail) return;

                    const eventData = {
                        problemId: detail.id,
                        title: detail.title,
                        description: detail.body,
                        inputFormat: detail.input_format,
                        outputFormat: detail.output_format,
                        constraints: detail.constraints,
                        tags: detail.tags,
                        hint1: detail.hints?.hint1 || "",
                        hint2: detail.hints?.hint2 || "",
                        solutionApproach: detail.hints?.solution_approach || "",
                        editorialCode: detail.editorial_code || []
                    };

                    window.dispatchEvent(new CustomEvent("maangProblemData", {
                        detail: eventData
                    }));
                }
            } catch (err) {
                console.error("Failed to intercept or parse /problems/user/ response:", err);
            }
        });

        return originalSend.apply(this, arguments);
    };
})();
