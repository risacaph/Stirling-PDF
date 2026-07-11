package stirling.software.proprietary.security.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

/** Registers {@link UserLicenseInterceptor} for all API endpoints. */
@Configuration
@RequiredArgsConstructor
public class UserLicenseWebConfig implements WebMvcConfigurer {

    private final UserLicenseInterceptor userLicenseInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(userLicenseInterceptor).addPathPatterns("/api/v1/**");
    }
}
