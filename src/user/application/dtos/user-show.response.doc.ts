import { createZodDto } from "nestjs-zod";
import { userShowResponseDto } from "./user-show.response.dto";

export class UserShowResponseDocDto extends createZodDto(userShowResponseDto) {}
