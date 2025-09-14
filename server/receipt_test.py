#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cashino EP-380C 프린터 테스트 코드
USB 연결을 통해 테스트 영수증을 출력하고 자르는 기능을 제공합니다.
"""

from escpos.printer import Serial, Win32Raw
from escpos import constants
import sys
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import io
import os




def find_cashino_printer():
    """
    Cashino EP-380C 프린터를 찾습니다.
    여러 연결 방식을 시도합니다.
    """
    # print("1. Win32Raw 연결 시도 중...")
    # # Windows 프린터 이름으로 연결 시도
    # win32_names = [
    #     "Cashino EP-380C",
    #     "EP-380C",
    #     "Generic / Text Only",
    #     "POS Printer",
    # ]
    
    # for printer_name in win32_names:
    #     try:
    #         printer = Win32Raw(printer_name)
    #         # 한글 지원을 위한 인코딩 설정
    #         try:
    #             printer.charcode('KOREAN')
    #         except:
    #             # KOREAN이 지원되지 않으면 CP949 시도
    #             try:
    #                 printer.charcode('CP949')
    #             except:
    #                 pass  # 기본 인코딩 사용
    #         print(f"✓ Win32Raw로 프린터를 찾았습니다! ({printer_name})")
    #         return printer
    #     except Exception as e:
    #         print(f"✗ Win32Raw {printer_name} 시도 실패: {e}")
    #         continue
    
    print("\n2. Serial 연결 시도 중...")
    # Serial 포트로 연결 시도
    serial_ports = [
        "COM1"
        # "COM1", "COM2", "COM3", "COM4", "COM5", "COM6",
        ]
    
    for port in serial_ports:
     
        printer = Serial(port, baudrate=115200, timeout=1,
        bytesize=8, parity='N', stopbits=1, dsrdtr=True)
        # 한글 지원을 위한 인코딩 설정


        printer._raw(b"\x1b\x52\x0D")
        printer._raw(b"\x1b\x74\x0D")

        # printer.charcode('CP949')
        print(f"✓ Serial로 프린터를 찾았습니다! ({port})")
        return printer
  
    # print("\n3. USB 직접 연결 시도 중...")
    # # USB 백엔드 설정
    # backend = setup_usb_backend()
    
    # # Cashino 프린터의 일반적인 USB ID들
    # cashino_ids = [
    #     (32902, 19325),  # 일반적인 Cashino/Epson 호환 ID
    #     (0x0416, 0x5011),  # 다른 가능한 Cashino ID
    #     (0x28e9, 0x0289),  # 또 다른 가능한 ID
    # ]
    
    # for vendor_id, product_id in cashino_ids:
    #     try:
    #         # 백엔드를 명시적으로 설정하여 프린터 생성
    #         if backend:
    #             printer = Usb(vendor_id, product_id, usb_args={'backend': backend})
    #         else:
    #             printer = Usb(vendor_id, product_id)
    #         print(f"✓ USB로 Cashino 프린터를 찾았습니다! (VID: 0x{vendor_id:04x}, PID: 0x{product_id:04x})")
    #         return printer
    #     except Exception as e:
    #         print(f"✗ USB VID: 0x{vendor_id:04x}, PID: 0x{product_id:04x} 시도 실패: {e}")
    #         continue
    
    return None


def create_text_image(text, font_size=20, max_width=400):
    """
    텍스트를 이미지로 변환합니다.
    """
    try:
        # 시스템 폰트 경로 시도
        font_paths = [
            "C:/Windows/Fonts/malgun.ttf",  # 맑은 고딕
            "C:/Windows/Fonts/gulim.ttc",   # 굴림
            "C:/Windows/Fonts/batang.ttc",  # 바탕
            "C:/Windows/Fonts/arial.ttf",   # Arial (영문 백업)
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue
        
        if font is None:
            font = ImageFont.load_default()
        
        # 텍스트 크기 측정
        temp_img = Image.new('RGB', (1, 1), 'white')
        temp_draw = ImageDraw.Draw(temp_img)
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # 최대 너비 제한
        if text_width > max_width:
            # 폰트 크기를 줄여서 다시 시도
            new_font_size = int(font_size * max_width / text_width)
            if font != ImageFont.load_default():
                font = ImageFont.truetype([p for p in font_paths if os.path.exists(p)][0], new_font_size)
            bbox = temp_draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        
        # 이미지 생성
        img = Image.new('RGB', (text_width + 20, text_height + 20), 'white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), text, fill='black', font=font)
        
        return img
    except Exception as e:
        print(f"텍스트 이미지 생성 실패: {e}")
        # 백업: 간단한 ASCII 텍스트 이미지
        img = Image.new('RGB', (200, 30), 'white')
        draw = ImageDraw.Draw(img)
        safe_text = text.encode('ascii', errors='replace').decode('ascii')
        draw.text((10, 10), safe_text, fill='black')
        return img


def resize_image_if_needed(image_path, max_width=500):
    """
    이미지의 너비가 max_width를 초과하면 비율을 유지하며 리사이즈합니다.
    리사이즈된 이미지는 임시 파일로 저장되고 경로를 반환합니다.
    """
    try:
        # 이미지 열기
        with Image.open(image_path) as img:
            width, height = img.size
            
            # 너비가 max_width 이하면 원본 경로 반환
            if width <= max_width:
                return image_path, False
            
            # 비율을 유지하며 리사이즈
            ratio = max_width / width
            new_width = max_width
            new_height = int(height * ratio)
            
            # 리사이즈된 이미지 생성
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # 임시 파일로 저장
            temp_path = f"temp_resized_{os.path.basename(image_path)}"
            resized_img.save(temp_path)
            
            print(f"✓ 이미지 리사이즈 완료: {width}x{height} → {new_width}x{new_height}")
            return temp_path, True
            
    except Exception as e:
        print(f"✗ 이미지 리사이즈 실패: {e}")
        return image_path, False


def print_korean_text(printer, text, font_size=20, align='left'):
    """
    한글 텍스트를 이미지로 변환하여 출력합니다.
    """
    try:
        # 텍스트를 이미지로 변환
        img = create_text_image(text.strip(), font_size)
        
        # 임시 파일로 저장
        temp_path = "temp_text.png"
        img.save(temp_path)
        
        # 정렬 설정
        printer.set(align=align)
        
        # 이미지 출력
        printer.image(temp_path)
        
        # 임시 파일 삭제
        try:
            os.remove(temp_path)
        except:
            pass
            
    except Exception as e:
        print(f"한글 텍스트 이미지 출력 실패: {e}")
        # 백업: 영문으로 출력
        safe_text = text.encode('ascii', errors='replace').decode('ascii')
        printer.text(safe_text)


def print_test_receipt(printer):
    """
    테스트 영수증을 출력합니다.
    """
    try:
        # 프린터 인코딩 재설정 (안전장치)
 
        
        # 헤더 출력
        print_korean_text(printer, "★ 테스트 영수증 ★", font_size=24, align='center')
        printer.text("\n")
        
        # 상점 정보
        print_korean_text(printer, "Cashino EP-380C 테스트", font_size=18, align='center')
        print_korean_text(printer, "프린터 연결 테스트", font_size=16, align='center')
        printer.text("-" * 32 + "\n")
        
        # 날짜/시간
        now = datetime.now()
        print_korean_text(printer, f"일시: {now.strftime('%Y-%m-%d %H:%M:%S')}", font_size=14)
        print_korean_text(printer, f"거래번호: TEST-{now.strftime('%Y%m%d%H%M%S')}", font_size=14)
        printer.text("-" * 32 + "\n")
        
        # 상품 목록
        print_korean_text(printer, "상품명              수량   금액", font_size=14)
        printer.text("-" * 32 + "\n")
        print_korean_text(printer, "테스트 상품 1         1   1,000", font_size=14)
        print_korean_text(printer, "테스트 상품 2         2   2,500", font_size=14)
        print_korean_text(printer, "테스트 상품 3         1   3,000", font_size=14)
        printer.text("-" * 32 + "\n")
        
        # 합계
        print_korean_text(printer, "총 금액:              6,500원", font_size=16)
        print_korean_text(printer, "받은 금액:           10,000원", font_size=16)
        print_korean_text(printer, "거스름돈:             3,500원", font_size=16)
        
        # 푸터
        printer.text("\n")
        print_korean_text(printer, "★ 이용해 주셔서 감사합니다 ★", font_size=18, align='center')
        printer.text("\n")
        
        # 로고 이미지 출력
        try:
            logo_path = "dino.png"
            if os.path.exists(logo_path):
                printer.set(align='center')
                # 이미지 리사이즈 확인 및 처리
                resized_path, was_resized = resize_image_if_needed(logo_path)
                printer.image(resized_path)
                
                # 임시 파일 정리
                if was_resized:
                    try:
                        os.remove(resized_path)
                    except:
                        pass
                
                printer.text("\n")
                print("✓ 로고 이미지 출력 완료!")
            else:
                print(f"✗ 로고 파일을 찾을 수 없습니다: {logo_path}")
        except Exception as logo_error:
            print(f"✗ 로고 이미지 출력 실패: {logo_error}")
        
        print("✓ 테스트 영수증 출력 완료!")
        return True
        
    except Exception as e:
        print(f"✗ 영수증 출력 중 오류 발생: {e}")
        import traceback
        print("상세 오류 정보:")
        traceback.print_exc()
        return False
 
def print_qwer_image(printer):
    """
    이미지를 출력합니다.
    """
    try:
        printer.set(align='center')
        print_korean_text(printer, "test", font_size=28, align='center')
        printer.text("\n\n")
        
        # 이미지 리사이즈 확인 및 처리
        image_path = r"C:\Users\Administrator\Documents\GitHub\github-to-receipt\server\images\github-receipt-woduq1414-2025-09-14.png"
        if os.path.exists(image_path):
            resized_path, was_resized = resize_image_if_needed(image_path)
            printer.image(resized_path)
            
            # 임시 파일 정리
            if was_resized:
                try:
                    os.remove(resized_path)
                except:
                    pass
        else:
            print(f"✗ 이미지 파일을 찾을 수 없습니다: {image_path}")
            return False
        printer.text("\n");
  
        printer.text("\n");
        printer.text("\n");
        return True
    except Exception as e:
        print(f"✗ 이미지 출력 실패: {e}")
        return False

def cut_paper(printer):
    """
    용지를 자릅니다.
    """
    try:
        printer.cut()
        print("✓ 용지 자르기 완료!")
        return True
    except Exception as e:
        print(f"✗ 용지 자르기 실패: {e}")
        return False


def main():
    """
    메인 함수: 프린터를 찾고 테스트 영수증을 출력합니다.
    """
    print("=== Cashino EP-380C 프린터 테스트 ===")
    print("USB로 연결된 Cashino 프린터를 찾는 중...")
    
    # 프린터 찾기
    printer = find_cashino_printer()
    
    if printer is None:
        print("\n✗ Cashino 프린터를 찾을 수 없습니다!")
        print("\n해결 방법:")
        print("1. 프린터가 USB로 올바르게 연결되었는지 확인")
        print("2. 프린터 전원이 켜져 있는지 확인")
        print("3. Windows 장치 관리자에서 프린터가 인식되는지 확인")
        print("4. 프린터 드라이버가 설치되어 있는지 확인")
        print("\n수동으로 USB ID를 확인하려면:")
        print("- 장치 관리자 > 범용 직렬 버스 컨트롤러에서 프린터 확인")
        print("- 속성 > 세부 정보 > 하드웨어 ID에서 VID_xxxx&PID_xxxx 확인")
        sys.exit(1)
    
    print("\n=== 테스트 영수증 출력 시작 ===")
    
    # 영수증 출력
    if print_qwer_image(printer):
        print("영수증 출력 성공!")
        
        # 용지 자르기
        if cut_paper(printer):
            print("용지 자르기 성공!")
        else:
            print("용지 자르기 실패 (프린터가 자동 자르기를 지원하지 않을 수 있음)")
    else:
        print("영수증 출력 실패!")
        sys.exit(1)
    
    # 프린터 연결 종료
    try:
        printer.close()
        print("✓ 프린터 연결 종료")
    except:
        pass
    
    print("\n=== 테스트 완료 ===")
    print("영수증이 성공적으로 출력되었습니다!")


if __name__ == "__main__":
    main()
